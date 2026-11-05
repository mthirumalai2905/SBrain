import { getSession } from "@/lib/auth";
import { mutate } from "@/lib/store";
import { rollbackArticle, saveArticle, transitionArticle } from "@/lib/workflow";
import type { ArticleStatus } from "@/lib/types";

const statuses: ArticleStatus[] = ["detected", "processing", "review_required", "approved", "published", "failed"];

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    title?: string;
    author?: string;
    section?: string;
    documentUrl?: string;
    body?: string;
    to?: ArticleStatus;
    note?: string;
    publishedUrl?: string;
    versionId?: string;
  } | null;
  if (!body?.action) return Response.json({ error: "Missing action." }, { status: 400 });

  const result = await mutate((db) => {
    if (body.action === "save") {
      return saveArticle(
        db,
        id,
        {
          title: body.title ?? "",
          body: body.body ?? "",
          section: body.section ?? "",
          author: body.author ?? "",
          documentUrl: body.documentUrl ?? "",
        },
        user,
      );
    }
    if (body.action === "transition") {
      if (!body.to || !statuses.includes(body.to)) return { ok: false as const, error: "That status is not available." };
      return transitionArticle(db, id, body.to, user, body.note ?? "", body.publishedUrl ?? "");
    }
    if (body.action === "rollback") {
      return rollbackArticle(db, id, body.versionId ?? "", user);
    }
    return { ok: false as const, error: "That action is not available." };
  });

  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ message: result.message });
}
