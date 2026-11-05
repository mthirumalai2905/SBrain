import { getSession } from "@/lib/auth";
import { mutate } from "@/lib/store";
import { createArticle } from "@/lib/workflow";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    siteId?: string;
    title?: string;
    author?: string;
    section?: string;
    documentUrl?: string;
    body?: string;
  } | null;
  if (!body?.siteId || !body.section) return Response.json({ error: "Choose a website and a section." }, { status: 400 });
  const result = await mutate((db) =>
    createArticle(db, {
      siteId: body.siteId ?? "",
      title: body.title ?? "",
      author: body.author ?? user.name,
      section: body.section ?? "",
      documentUrl: body.documentUrl ?? "",
      body: body.body ?? "",
      source: "manual",
      actor: user,
    }),
  );
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ article: { id: result.article.id }, message: result.message });
}
