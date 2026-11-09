import { randomUUID } from "crypto";
import type { AuditActor, AuditStatus } from "./harness/log";
import { githubHost } from "./github";
import { prepareCodePush, pullAuditLine, raisePullRequest, type CodePushPlan, type GitHost, type PreparedPull } from "./pull-request";
import { mutate, readDb } from "./store";
import type { DB, PublicUser } from "./types";
import { addLog, createArticle } from "./workflow";

export function documentBrief(input: { title: string; body: string; documentUrl?: string }) {
  const title = input.title.trim().replace(/[“”"]/g, "");
  const lines = [`"${title}"`];
  if (input.documentUrl?.trim()) lines.push(`Document: ${input.documentUrl.trim()}`);
  lines.push("", input.body.trim());
  return lines.join("\n");
}

export function prepareDocument(
  db: DB,
  actor: PublicUser,
  input: { title: string; body: string; siteId: string; intentId: string; section?: string; documentUrl?: string },
) {
  return prepareCodePush(db, documentBrief(input), actor, {
    siteId: input.siteId,
    intentId: input.intentId,
    document: { title: input.title, body: input.body, section: input.section },
  });
}

export function documentAlreadyUsed(db: DB, siteId: string, documentUrl: string) {
  const url = documentUrl.trim();
  if (!url) return null;
  return db.articles.find((article) => article.documentUrl === url && article.siteId === siteId && article.status !== "failed") ?? null;
}

export function noteChange(
  db: DB,
  input: { site: string; status: AuditStatus; result: string; error: string | null; approvalId: string | null; started: number; actor: AuditActor; kind: "agent" | "drive" | "content" },
) {
  addLog(db, {
    kind: input.kind,
    actor: input.actor,
    action: "open_pull_request",
    target: input.site || "Brain",
    detail: pullAuditLine({
      site: input.site,
      status: input.status,
      result: input.result,
      error: input.error,
      approvalId: input.approvalId,
      durationMs: Date.now() - input.started,
      actor: input.actor,
    }),
  });
}

export async function runChange(prepared: CodePushPlan, host: GitHost | null) {
  if (!prepared.pull) {
    const status: AuditStatus = /^dry run\b/i.test(prepared.error) ? "dry_run" : "blocked";
    return { ok: false as const, status, error: prepared.error, promptOk: prepared.promptOk, pull: null };
  }
  try {
    const opened = await raisePullRequest(prepared, host);
    if (!opened.ok) return { ok: false as const, status: "failed" as const, error: opened.error, promptOk: true, pull: prepared.pull };
    return { ok: true as const, status: "ok" as const, url: opened.url, pull: opened.pull, promptOk: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub did not open the pull request.";
    return { ok: false as const, status: "failed" as const, error: message, promptOk: true, pull: prepared.pull };
  }
}

export function storeOpenedChange(
  db: DB,
  actor: PublicUser,
  input: { pull: PreparedPull; url: string; source: "agent" | "drive" | "manual"; documentUrl?: string; author?: string; folder?: string },
) {
  const article = createArticle(db, {
    siteId: input.pull.siteId,
    title: input.pull.title,
    body: `${input.url}\n\n${input.pull.body}`,
    section: input.pull.section,
    author: input.author?.trim() || actor.name,
    documentUrl: input.documentUrl?.trim() || input.url,
    source: input.source,
    actor,
    intent: input.pull.intent,
  });
  if (input.folder) {
    db.drive.files.unshift({
      id: randomUUID(),
      name: input.pull.title,
      folder: input.folder,
      targetSiteId: input.pull.siteId,
      articleId: article.ok ? article.article.id : null,
      state: "processed",
      addedAt: new Date().toISOString(),
      addedBy: actor.name,
    });
  }
  const message = article.ok ? `${input.url} The live site was not changed.` : `${input.url} ${article.error} The live site was not changed.`;
  return { articleId: article.ok ? article.article.id : null, message };
}

export async function submitDocument(
  actor: PublicUser,
  input: {
    title: string;
    body: string;
    siteId: string;
    intentId: string;
    section?: string;
    documentUrl?: string;
    author?: string;
    folder?: string;
    source: "drive" | "manual";
  },
) {
  const snapshot = readDb();
  const duplicate = documentAlreadyUsed(snapshot, input.siteId, input.documentUrl ?? "");
  if (duplicate) return { ok: false as const, error: `That document is already linked to “${duplicate.title}”.` };
  const prepared = prepareDocument(snapshot, actor, input);
  const started = Date.now();
  const result = await runChange(prepared, prepared.pull ? githubHost() : null);
  const site = (result.ok ? result.pull.siteId : result.pull?.siteId) ?? input.siteId;
  const approvalId = (result.ok ? result.pull.approvalId : result.pull?.approvalId) ?? null;
  if (!result.ok) {
    await mutate((db) => {
      noteChange(db, { site, status: result.status, result: result.error, error: result.error, approvalId, started, actor: "human", kind: input.source === "drive" ? "drive" : "content" });
      if (input.folder) {
        db.drive.files.unshift({
          id: randomUUID(),
          name: input.title.trim() || "Document",
          folder: input.folder,
          targetSiteId: input.siteId,
          articleId: null,
          state: "failed",
          addedAt: new Date().toISOString(),
          addedBy: actor.name,
        });
      }
      return null;
    });
    return { ok: false as const, error: result.error };
  }
  const saved = await mutate((db) => {
    noteChange(db, { site: result.pull.siteId, status: "ok", result: result.url, error: null, approvalId: result.pull.approvalId, started, actor: "human", kind: input.source === "drive" ? "drive" : "content" });
    return storeOpenedChange(db, actor, {
      pull: result.pull,
      url: result.url,
      source: input.source,
      documentUrl: input.documentUrl,
      author: input.author,
      folder: input.folder,
    });
  });
  return { ok: true as const, url: result.url, articleId: saved.articleId, message: saved.message };
}
