import { getSession } from "@/lib/auth";
import { submitDocument } from "@/lib/change";
import { canEdit } from "@/lib/rbac";
import { mutate, readDb } from "@/lib/store";
import { workResponse } from "@/lib/work-stream";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    name?: string;
    folder?: string;
    siteId?: string;
    intentId?: string;
    section?: string;
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

  if (!body || body.action !== "ingest") return Response.json({ error: "That Drive action is not available." }, { status: 400 });
  if (!canEdit(user.role)) return Response.json({ error: "You cannot bring documents in." }, { status: 403 });
  const title = body.title?.trim() ?? "";
  const text = body.body?.trim() ?? "";
  const siteId = body.siteId?.trim() ?? "";
  const intentId = body.intentId?.trim() ?? "";
  if (!siteId || !intentId || !title || !text) return Response.json({ error: "Choose a website, an intent, a title, and a body." }, { status: 400 });
  if (title.length > 180) return Response.json({ error: "The title is too long." }, { status: 400 });
  if (text.length > 100_000) return Response.json({ error: "That document is too long." }, { status: 400 });
  const snapshot = readDb();
  const folder = body.folder?.trim() || snapshot.drive.folders[0] || "Incoming";
  if (!snapshot.drive.folders.includes(folder)) return Response.json({ error: "That folder is not on the watch list." }, { status: 400 });
  return workResponse(async (emit) => {
    const result = await submitDocument(
      user,
      {
        title,
        body: text,
        siteId,
        intentId,
        section: body.section?.trim() ?? "",
        documentUrl: body.documentUrl?.trim() ?? "",
        author: body.author?.trim() ?? "",
        folder,
        source: "drive",
      },
      emit,
    );
    if (!result.ok) emit({ type: "error", error: result.error });
    else emit({ type: "done", articleId: result.articleId, message: result.message, url: result.url });
  });
}
