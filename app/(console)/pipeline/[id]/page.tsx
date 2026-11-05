import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleWorkspace } from "@/components/article-workspace";
import { requireUser } from "@/lib/auth";
import { liveDb } from "@/lib/live";

export const metadata: Metadata = { title: "Article" };

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const db = await liveDb();
  const article = db.articles.find((item) => item.id === id);
  if (!article) notFound();
  const site = db.sites.find((item) => item.id === article.siteId);
  if (!site) notFound();
  return <ArticleWorkspace key={article.updatedAt} article={article} siteName={site.name} sections={site.sections} user={user} />;
}
