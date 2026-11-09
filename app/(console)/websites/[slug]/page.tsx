import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Group, RowLink, Empty } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { liveDb } from "@/lib/live";
import { canEdit, statusLabel } from "@/lib/rbac";
import { formatWhen } from "@/lib/format";

export const metadata: Metadata = { title: "Website" };

export default async function WebsitePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const db = await liveDb();
  const site = db.sites.find((item) => item.slug === slug);
  if (!site) notFound();
  const articles = db.articles.filter((article) => article.siteId === site.id);

  return (
    <div>
      <PageHeader
        title={site.name}
        lede={site.summary}
        actions={
          canEdit(user.role) ? (
            <Link className="btn btn-fill" href={`/websites/${site.slug}/new`}>
              New change
            </Link>
          ) : null
        }
      />
      <div className="stack">
        <Group title="Deployment" footer={site.deploymentNote}>
          <RowLink href={site.publicUrl} external title="Public site" sub={site.publicUrl} />
          <div className="row">
            <span className="row-main">
              <span className="row-title">Observed stack</span>
              <span className="row-sub">{site.stack}</span>
            </span>
          </div>
          <div className="row">
            <span className="row-main">
              <span className="row-title">Publishing connector</span>
              <span className="row-sub">Not configured. Brain will not send content to this deployment.</span>
            </span>
          </div>
        </Group>
        <Group title="Sections" footer={site.formatting}>
          {site.sections.map((section) => (
            <div className="row" key={section.id}>
              <span className="row-main">
                <span className="row-title">{section.label}</span>
                <span className="row-sub">{section.note || section.path}</span>
              </span>
              <span className="row-aside">{section.path}</span>
            </div>
          ))}
        </Group>
        <Group title="Content in Brain">
          {articles.length ? (
            articles.map((article) => (
              <RowLink
                key={article.id}
                href={`/pipeline/${article.id}`}
                title={article.title}
                sub={`${statusLabel[article.status]} · ${article.author}`}
                aside={formatWhen(article.updatedAt)}
              />
            ))
          ) : (
            <Empty title="No changes yet" body="Send one from here, or bring a document in from Drive. The live site stays as it is until a later deploy." />
          )}
        </Group>
      </div>
    </div>
  );
}
