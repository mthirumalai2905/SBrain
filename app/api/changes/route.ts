import { getSession } from "@/lib/auth";
import { submitDocument } from "@/lib/change";
import { canEdit } from "@/lib/rbac";
import { workResponse } from "@/lib/work-stream";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!canEdit(user.role)) return Response.json({ error: "You have read-only access." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as {
    siteId?: string;
    intentId?: string;
    section?: string;
    title?: string;
    author?: string;
    documentUrl?: string;
    body?: string;
  } | null;
  const title = body?.title?.trim() ?? "";
  const text = body?.body?.trim() ?? "";
  const siteId = body?.siteId?.trim() ?? "";
  const intentId = body?.intentId?.trim() ?? "";
  if (!siteId || !intentId || !title || !text) return Response.json({ error: "Choose a website, an intent, a title, and a body." }, { status: 400 });
  if (title.length > 180) return Response.json({ error: "The title is too long." }, { status: 400 });
  if (text.length > 100_000) return Response.json({ error: "That document is too long." }, { status: 400 });
  return workResponse(async (emit) => {
    const result = await submitDocument(
      user,
      {
        title,
        body: text,
        siteId,
        intentId,
        section: body?.section?.trim() ?? "",
        documentUrl: body?.documentUrl?.trim() ?? "",
        author: body?.author?.trim() ?? "",
        source: "manual",
      },
      emit,
    );
    if (!result.ok) emit({ type: "error", error: result.error });
    else emit({ type: "done", articleId: result.articleId, message: result.message, url: result.url });
  });
}
