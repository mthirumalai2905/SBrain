import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Group, RowLink, Empty } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { liveDb } from "@/lib/live";
import { statusLabel, statusOrder } from "@/lib/rbac";
import { formatWhen } from "@/lib/format";
import type { ArticleStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireUser();
  const query = await searchParams;
  const db = await liveDb();
  const selected = statusOrder.find((status) => status === query.status) ?? null;
  const visible = selected ? db.articles.filter((article) => article.status === selected) : db.articles;

  return (
    <div>
      <PageHeader title="Pipeline" lede="Detected, processing, review, approval, publication record, or failure. Publishing to a live site is a separate step Brain cannot take yet." />
      <div className="segment filters">
        <Link className={!selected ? "on" : undefined} href="/pipeline">
          All
        </Link>
        {statusOrder.map((status) => (
          <Link key={status} className={selected === status ? "on" : undefined} href={`/pipeline?status=${status}`}>
            {statusLabel[status]}
          </Link>
        ))}
      </div>
      <div className="stack">
        {(selected ? [selected] : statusOrder).map((status) => {
          const items = visible.filter((article) => article.status === status);
          if (!selected && !items.length) return null;
          return (
            <Group key={status} title={statusLabel[status as ArticleStatus]}>
              {items.length ? (
                items.map((article) => {
                  const site = db.sites.find((item) => item.id === article.siteId);
                  return (
                    <RowLink
                      key={article.id}
                      href={`/pipeline/${article.id}`}
                      title={article.title}
                      sub={`${site?.name ?? "Website"} · ${article.author}`}
                      aside={formatWhen(article.updatedAt)}
                    />
                  );
                })
              ) : (
                <Empty title="None" body={`Nothing is ${statusLabel[status].toLowerCase()}.`} />
              )}
            </Group>
          );
        })}
        {!db.articles.length ? (
          <Group>
            <Empty title="The pipeline is empty" body="Changes you send, and documents you bring in, move through these statuses." />
          </Group>
        ) : null}
      </div>
    </div>
  );
}
