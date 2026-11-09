import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NewArticleForm } from "@/components/new-article-form";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { intentChoices } from "@/lib/intents";
import { liveDb } from "@/lib/live";
import { canEdit } from "@/lib/rbac";

export const metadata: Metadata = { title: "New change" };

export default async function NewArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  if (!canEdit(user.role)) redirect("/websites");
  const { slug } = await params;
  const db = await liveDb();
  const site = db.sites.find((item) => item.slug === slug);
  if (!site) notFound();
  return (
    <div>
      <PageHeader title="New change" lede={site.name} />
      <NewArticleForm siteId={site.id} siteName={site.name} intents={intentChoices([site])} author={user.name} />
    </div>
  );
}
