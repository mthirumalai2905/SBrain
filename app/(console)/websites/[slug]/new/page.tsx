import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NewArticleForm } from "@/components/new-article-form";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { liveDb } from "@/lib/live";
import { canEdit } from "@/lib/rbac";

export const metadata: Metadata = { title: "New Article" };

export default async function NewArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  if (!canEdit(user.role)) redirect("/websites");
  const { slug } = await params;
  const db = await liveDb();
  const site = db.sites.find((item) => item.slug === slug);
  if (!site) notFound();
  return (
    <div>
      <PageHeader title="New Article" lede={site.name} />
      <NewArticleForm siteId={site.id} siteName={site.name} sections={site.sections} author={user.name} />
    </div>
  );
}
