import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { canEdit } from "@/lib/rbac";
import { mutate } from "@/lib/store";
import { createArticle, defaultSectionFor, queueFormatJob, runQueuedJobs } from "@/lib/workflow";
import type { DriveFile } from "@/lib/types";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    name?: string;
    folder?: string;
    siteId?: string;
    title?: string;
    author?: string;
    documentUrl?: string;
    body?: string;
  } | null;

  if (body?.action === "folder") {
    if (user.role !== "owner") return Response.json({ error: "Only an owner can change the watch list." }, { status: 403 });
    const name = body.name?.trim() ?? "";
    if (!name || name.length > 80) return Response.json({ error: "Enter a folder name." }, { status: 400 });
    const result = await mutate((db) => {
      if (db.drive.folders.some((folder) => folder.toLowerCase() === name.toLowerCase())) {
        return { ok: false as const, error: "That folder is already on the list." };
      }
      db.drive.folders.push(name);
      return { ok: true as const };
    });
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ ok: true });
  }

  if (body?.action !== "ingest") return Response.json({ error: "That Drive action is not available." }, { status: 400 });
  if (!canEdit(user.role)) return Response.json({ error: "You cannot bring documents in." }, { status: 403 });

  const result = await mutate((db) => {
    const site = db.sites.find((item) => item.id === body.siteId);
    if (!site) return { ok: false as const, error: "Choose a website." };
    const folder = body.folder?.trim() || db.drive.folders[0] || "Incoming";
    if (!db.drive.folders.includes(folder)) return { ok: false as const, error: "That folder is not on the watch list." };
    const documentUrl = body.documentUrl?.trim() ?? "";
    if (documentUrl) {
      const existing = db.articles.find(
        (article) => article.documentUrl === documentUrl && article.siteId === site.id && article.status !== "failed",
      );
      if (existing) return { ok: false as const, error: `That document is already linked to “${existing.title}”.` };
    }
    const created = createArticle(db, {
      siteId: site.id,
      title: body.title ?? "",
      body: body.body ?? "",
      section: defaultSectionFor(site.id),
      author: body.author?.trim() || user.name,
      documentUrl,
      source: "drive",
      actor: user,
      hold: true,
    });
    if (!created.ok) return created;
    const file: DriveFile = {
      id: randomUUID(),
      name: created.article.title,
      folder,
      targetSiteId: site.id,
      articleId: created.article.id,
      state: "detected",
      addedAt: new Date().toISOString(),
      addedBy: user.name,
    };
    db.drive.files.unshift(file);
    if (created.article.status === "detected") queueFormatJob(db, created.article.id);
    runQueuedJobs(db, user.name);
    file.state = created.article.status === "failed" ? (created.article.duplicateOf ? "duplicate" : "failed") : "processed";
    const message =
      created.article.status === "review_required"
        ? `“${created.article.title}” is in Review Required for ${site.name}. Nothing was sent to the live site.`
        : created.message;
    return { ok: true as const, articleId: created.article.id, message };
  });

  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ articleId: result.articleId, message: result.message });
}
