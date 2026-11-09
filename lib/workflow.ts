import { randomUUID } from "crypto";
import type { Article, ArticleStatus, DB, LogEntry, PublicUser, Version } from "./types";
import { normalTitle, slugify } from "./format";
import { canEdit, canRecordPublication, canReview, canRollback } from "./rbac";

function now() {
  return new Date().toISOString();
}

export function addLog(db: DB, entry: Omit<LogEntry, "id" | "at">) {
  db.logs.unshift({ id: randomUUID(), at: now(), ...entry });
  db.logs = db.logs.slice(0, 400);
}

function snapshot(article: Article, actor: string): Version {
  return {
    id: randomUUID(),
    title: article.title,
    body: article.body,
    section: article.section,
    savedAt: now(),
    savedBy: actor,
  };
}

function pushHistory(article: Article, status: ArticleStatus, actor: string, note: string) {
  article.history.push({ id: randomUUID(), at: now(), status, actor, note });
  article.status = status;
  article.updatedAt = now();
}

export function uniqueSlug(db: DB, siteId: string, title: string, ignoreId?: string) {
  const base = slugify(title);
  let slug = base;
  let n = 2;
  while (db.articles.some((item) => item.siteId === siteId && item.slug === slug && item.id !== ignoreId)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

export function findDuplicate(db: DB, siteId: string, title: string, slug: string, ignoreId?: string) {
  const key = normalTitle(title);
  return (
    db.articles.find((item) => {
      if (item.id === ignoreId || item.siteId !== siteId) return false;
      if (item.status !== "approved" && item.status !== "published" && item.status !== "review_required") return false;
      return item.slug === slug || normalTitle(item.title) === key;
    }) ?? null
  );
}

export function siteById(db: DB, siteId: string) {
  return db.sites.find((site) => site.id === siteId) ?? null;
}

export function sectionAllowed(db: DB, siteId: string, section: string) {
  return Boolean(siteById(db, siteId)?.sections.some((item) => item.path === section));
}

export function createArticle(
  db: DB,
  input: {
    siteId: string;
    title: string;
    body: string;
    section: string;
    author: string;
    documentUrl: string;
    source: Article["source"];
    actor: PublicUser;
    hold?: boolean;
    intent?: string;
  },
): { ok: true; article: Article; message: string } | { ok: false; error: string } {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!canEdit(input.actor.role) && input.source !== "agent") {
    return { ok: false, error: "You have read-only access." };
  }
  if (input.source === "agent" && input.actor.role === "viewer") {
    return { ok: false, error: "Viewers cannot ask the agent to create articles." };
  }
  if (!title) return { ok: false, error: "A title is required." };
  if (title.length > 180) return { ok: false, error: "The title is too long." };
  const site = siteById(db, input.siteId);
  if (!site) return { ok: false, error: "That website is not in Brain." };
  if (!sectionAllowed(db, site.id, input.section)) {
    return { ok: false, error: "That section is not part of this website’s observed structure." };
  }
  const slug = uniqueSlug(db, site.id, title);
  const duplicate = findDuplicate(db, site.id, title, slug);
  const stamp = now();
  const article: Article = {
    id: randomUUID(),
    siteId: site.id,
    title,
    slug,
    section: input.section,
    status: "detected",
    author: input.author.trim() || input.actor.name,
    source: input.source,
    intent: input.intent,
    documentUrl: input.documentUrl.trim(),
    body,
    publishedUrl: "",
    duplicateOf: duplicate?.id ?? null,
    versions: [],
    history: [],
    createdAt: stamp,
    updatedAt: stamp,
  };
  article.versions.push(snapshot(article, input.actor.name));
  pushHistory(article, "detected", input.actor.name, "Entered Brain.");
  if (!body) {
    pushHistory(article, "failed", input.actor.name, "No article body to format.");
  } else if (duplicate) {
    pushHistory(
      article,
      "failed",
      input.actor.name,
      `Duplicate of “${duplicate.title}”. It was not queued for publishing.`,
    );
  } else if (!input.hold) {
    pushHistory(article, "processing", input.actor.name, "Formatted against the website’s observed sections.");
    pushHistory(article, "review_required", input.actor.name, "Ready for review. The live website was not changed.");
  }
  db.articles.unshift(article);
  addLog(db, {
    kind: "content",
    actor: input.actor.name,
    action: article.status === "failed" ? "Blocked" : "Drafted",
    target: `${site.name} · ${article.title}`,
    detail: article.history[article.history.length - 1]?.note ?? "",
  });
  const message =
    article.status === "failed"
      ? article.history[article.history.length - 1]?.note ?? "The article failed."
      : article.status === "detected"
        ? `“${article.title}” was detected for ${site.name} and queued for formatting.`
        : `“${article.title}” is in Review Required for ${site.name}. Nothing was sent to the live site.`;
  return { ok: true, article, message };
}

export function defaultSectionFor(siteId: string) {
  if (siteId === "synx") return "/news";
  if (siteId === "realtimeweb") return "/blog";
  if (siteId === "skalle") return "/articles";
  if (siteId === "morph") return "/drafts";
  return "";
}

export function saveArticle(
  db: DB,
  articleId: string,
  input: { title: string; body: string; section: string; author: string; documentUrl: string },
  actor: PublicUser,
): { ok: true; article: Article; message: string } | { ok: false; error: string } {
  if (!canEdit(actor.role)) return { ok: false, error: "You cannot edit articles." };
  const article = db.articles.find((item) => item.id === articleId);
  if (!article) return { ok: false, error: "That article is not in Brain." };
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) return { ok: false, error: "A title is required." };
  if (!sectionAllowed(db, article.siteId, input.section)) {
    return { ok: false, error: "That section is not part of this website’s observed structure." };
  }
  const changed = title !== article.title || body !== article.body || input.section !== article.section;
  if (changed) article.versions.push(snapshot(article, actor.name));
  article.title = title;
  article.body = body;
  article.section = input.section;
  article.author = input.author.trim() || article.author;
  article.documentUrl = input.documentUrl.trim();
  article.slug = uniqueSlug(db, article.siteId, title, article.id);
  article.updatedAt = now();
  if (article.status === "published" || article.status === "approved") {
    pushHistory(article, "review_required", actor.name, "Edited after approval. The live page was not changed.");
  } else if (article.status === "failed" || article.status === "detected") {
    pushHistory(article, "processing", actor.name, "Saved and sent back through formatting.");
    pushHistory(article, "review_required", actor.name, "Ready for review again.");
  } else {
    pushHistory(article, article.status, actor.name, "Saved a new version.");
  }
  const site = siteById(db, article.siteId);
  addLog(db, {
    kind: "content",
    actor: actor.name,
    action: "Saved",
    target: `${site?.name ?? "Website"} · ${article.title}`,
    detail: "A version was stored in Brain.",
  });
  return { ok: true, article, message: "Saved in Brain. The live website was not changed." };
}

export function transitionArticle(
  db: DB,
  articleId: string,
  to: ArticleStatus,
  actor: PublicUser,
  note: string,
  publishedUrl = "",
): { ok: true; article: Article; message: string } | { ok: false; error: string } {
  const article = db.articles.find((item) => item.id === articleId);
  if (!article) return { ok: false, error: "That article is not in Brain." };
  const site = siteById(db, article.siteId);
  const cleanNote = note.trim();

  if (to === "review_required") {
    if (!canEdit(actor.role) && !canReview(actor.role)) return { ok: false, error: "You cannot submit this article." };
    if (!article.body.trim()) return { ok: false, error: "Add the article body before review." };
    pushHistory(article, "review_required", actor.name, cleanNote || "Submitted for review.");
  } else if (to === "approved") {
    if (!canReview(actor.role)) return { ok: false, error: "Only a reviewer or owner can approve." };
    if (article.status !== "review_required") return { ok: false, error: "Only articles in Review Required can be approved." };
    const duplicate = findDuplicate(db, article.siteId, article.title, article.slug, article.id);
    if (duplicate && duplicate.status === "published") {
      return { ok: false, error: `“${duplicate.title}” is already recorded as published.` };
    }
    pushHistory(article, "approved", actor.name, cleanNote || "Approved in Brain. The live website was not changed.");
  } else if (to === "processing") {
    if (!canReview(actor.role) && !canEdit(actor.role)) return { ok: false, error: "You cannot return this article." };
    pushHistory(article, "processing", actor.name, cleanNote || "Returned for changes.");
  } else if (to === "published") {
    if (!canRecordPublication(actor.role)) {
      return { ok: false, error: "Only an owner can record a published URL." };
    }
    if (article.status !== "approved" && article.status !== "published") {
      return { ok: false, error: "Approve the article before recording a URL." };
    }
    if (!publishedUrl || !/^https?:\/\//.test(publishedUrl)) {
      return { ok: false, error: "Enter the URL of the page that was published on the existing site." };
    }
    const duplicate = db.articles.find(
      (item) => item.id !== article.id && item.siteId === article.siteId && item.publishedUrl === publishedUrl,
    );
    if (duplicate) return { ok: false, error: "That URL is already recorded on another article." };
    article.publishedUrl = publishedUrl;
    pushHistory(
      article,
      "published",
      actor.name,
      "Recorded a URL from the existing site. Brain did not publish it.",
    );
  } else if (to === "failed") {
    if (actor.role !== "owner" && actor.role !== "operator" && actor.role !== "editor") {
      return { ok: false, error: "You cannot mark this as failed." };
    }
    pushHistory(article, "failed", actor.name, cleanNote || "Marked as failed.");
  } else {
    return { ok: false, error: "That status change is not available." };
  }

  addLog(db, {
    kind: "content",
    actor: actor.name,
    action: to === "published" ? "Recorded URL" : "Status",
    target: `${site?.name ?? "Website"} · ${article.title}`,
    detail: article.history[article.history.length - 1]?.note ?? "",
  });
  return { ok: true, article, message: article.history[article.history.length - 1]?.note ?? "Updated." };
}

export function rollbackArticle(
  db: DB,
  articleId: string,
  versionId: string,
  actor: PublicUser,
): { ok: true; article: Article; message: string } | { ok: false; error: string } {
  if (!canRollback(actor.role)) return { ok: false, error: "You cannot roll back articles." };
  const article = db.articles.find((item) => item.id === articleId);
  if (!article) return { ok: false, error: "That article is not in Brain." };
  const version = article.versions.find((item) => item.id === versionId);
  if (!version) return { ok: false, error: "That version is not stored." };
  article.versions.push(snapshot(article, actor.name));
  article.title = version.title;
  article.body = version.body;
  article.section = version.section;
  article.slug = uniqueSlug(db, article.siteId, version.title, article.id);
  article.updatedAt = now();
  pushHistory(article, "review_required", actor.name, `Rolled back to the version from ${version.savedBy}. The live website was not changed.`);
  const site = siteById(db, article.siteId);
  addLog(db, {
    kind: "content",
    actor: actor.name,
    action: "Rolled back",
    target: `${site?.name ?? "Website"} · ${article.title}`,
    detail: "Restored an earlier Brain version and returned it to Review Required.",
  });
  return { ok: true, article, message: "Rolled back in Brain. The live website was not changed." };
}

export function queueFormatJob(db: DB, articleId: string) {
  const job = {
    id: randomUUID(),
    kind: "format_article" as const,
    articleId,
    status: "queued" as const,
    attempts: 0,
    maxAttempts: 3,
    lastError: "",
    createdAt: now(),
    updatedAt: now(),
  };
  db.jobs.unshift(job);
  return job;
}

export function reopenFailedJobs(db: DB) {
  let count = 0;
  for (const job of db.jobs) {
    if (job.status !== "error") continue;
    job.status = "queued";
    job.attempts = 0;
    job.lastError = "";
    job.updatedAt = now();
    count += 1;
  }
  return count;
}

export function runQueuedJobs(db: DB, actorName: string) {
  const ready = db.jobs.filter((job) => job.status === "queued" || job.status === "error");
  let processed = 0;
  for (const job of ready) {
    if (job.attempts >= job.maxAttempts) continue;
    job.status = "running";
    job.attempts += 1;
    job.updatedAt = now();
    const article = db.articles.find((item) => item.id === job.articleId);
    if (!article) {
      job.status = "error";
      job.lastError = "Article missing.";
      continue;
    }
    try {
      if (article.status === "failed" && article.duplicateOf) {
        job.status = "done";
        processed += 1;
        continue;
      }
      if (!article.body.trim()) throw new Error("The document had no body.");
      const duplicate = findDuplicate(db, article.siteId, article.title, article.slug, article.id);
      if (duplicate) {
        article.duplicateOf = duplicate.id;
        pushHistory(article, "failed", actorName, `Duplicate of “${duplicate.title}”. Publishing blocked.`);
        job.status = "done";
      } else if (article.status === "detected" || article.status === "failed" || article.status === "processing") {
        pushHistory(article, "processing", actorName, "Background formatting started.");
        pushHistory(article, "review_required", actorName, "Formatted for review. The live website was not changed.");
        job.status = "done";
      } else {
        job.status = "done";
      }
      processed += 1;
    } catch (error) {
      job.status = "error";
      job.lastError = error instanceof Error ? error.message : "Formatting failed.";
      if (job.attempts >= job.maxAttempts) {
        pushHistory(article, "failed", actorName, job.lastError);
      }
      processed += 1;
    }
  }
  if (processed) {
    addLog(db, {
      kind: "system",
      actor: actorName,
      action: "Jobs",
      target: "Formatting",
      detail: `${processed} background ${processed === 1 ? "job" : "jobs"} ran.`,
    });
  }
  return processed;
}
