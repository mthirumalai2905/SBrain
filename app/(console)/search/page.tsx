import type { Metadata } from "next";
import { PageHeader, Group, RowLink, Empty } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { liveDb } from "@/lib/live";
import { formatWhen } from "@/lib/format";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser();
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const db = await liveDb();
  const articles = query
    ? db.articles.filter((article) => `${article.title} ${article.body} ${article.author}`.toLowerCase().includes(query))
    : [];
  const logs = query
    ? db.logs.filter((entry) => `${entry.action} ${entry.target} ${entry.detail}`.toLowerCase().includes(query)).slice(0, 20)
    : [];

  return (
    <div>
      <PageHeader title="Search" lede={query ? `Results for “${q}”` : "Articles and the audit trail."} />
      {!query ? (
        <Group>
          <Empty title="Search Brain" body="Use the field in the sidebar." />
        </Group>
      ) : (
        <div className="stack">
          <Group title="Articles">
            {articles.length ? (
              articles.map((article) => {
                const site = db.sites.find((item) => item.id === article.siteId);
                return <RowLink key={article.id} href={`/pipeline/${article.id}`} title={article.title} sub={site?.name} aside={formatWhen(article.updatedAt)} />;
              })
            ) : (
              <Empty title="Nothing matches" body="Nothing in Brain matches." />
            )}
          </Group>
          <Group title="Logs">
            {logs.length ? (
              logs.map((entry) => (
                <div className="row" key={entry.id}>
                  <span className="row-main">
                    <span className="row-title">
                      {entry.action} · {entry.target}
                    </span>
                    <span className="row-sub">{entry.detail}</span>
                  </span>
                </div>
              ))
            ) : (
              <Empty title="No log entries" body="The audit trail has no match." />
            )}
          </Group>
        </div>
      )}
    </div>
  );
}
