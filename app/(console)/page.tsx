import type { Metadata } from "next";
import { PageHeader, Group, RowLink, Empty } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { liveDb } from "@/lib/live";
import { formatWhen } from "@/lib/format";
import { statusLabel } from "@/lib/rbac";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  await requireUser();
  const db = await liveDb();
  const waiting = db.articles.filter((article) => article.status === "review_required");
  const failed = db.articles.filter((article) => article.status === "failed");
  const unhealthy = db.probes.filter((probe) => !probe.ok);
  const attention = [
    ...failed.map((article) => ({ href: `/pipeline/${article.id}`, title: article.title, sub: "Failed" })),
    ...unhealthy.map((probe) => ({ href: "/health", title: probe.url, sub: probe.error || `HTTP ${probe.status}` })),
  ];
  const healthValue = !db.probes.length ? "Not checked" : unhealthy.length ? "Needs a look" : "Responding";

  return (
    <div>
      <PageHeader title="Overview" lede="Synx, Real Time Web, Morph Space, and Skalle AI. Their deployments stay where they are." />
      <div className="widgets">
        <article className="widget">
          <p className="widget-kicker">Review</p>
          <p className="widget-value">{waiting.length}</p>
          <p className="widget-detail">{waiting.length === 1 ? "Article waiting" : "Articles waiting"}</p>
        </article>
        <article className="widget">
          <p className="widget-kicker">Websites</p>
          <p className="widget-value">{db.sites.length}</p>
          <p className="widget-detail">Live deployments untouched</p>
        </article>
        <article className="widget">
          <p className="widget-kicker">Health</p>
          <p className={healthValue === "Responding" ? "widget-value" : "widget-value phrase"}>{healthValue}</p>
          <p className="widget-detail">{db.probes[0] ? `Last check ${formatWhen(db.probes[0].checkedAt)}` : "Public pages only"}</p>
        </article>
        <article className="widget">
          <p className="widget-kicker">Drive</p>
          <p className="widget-value phrase">Not connected</p>
          <p className="widget-detail">{db.drive.folders.length} watch {db.drive.folders.length === 1 ? "folder" : "folders"} stored locally</p>
        </article>
      </div>
      <div className="stack">
        <Group title="Needs attention" footer="Publishing connectors and the VPS agent are not configured. Those are setup gaps, not outages.">
          {attention.length ? (
            attention.map((item) => <RowLink key={item.href + item.title} href={item.href} title={item.title} sub={item.sub} />)
          ) : (
            <Empty title="Nothing needs attention" body="Failed articles and unhealthy public checks will show up here." />
          )}
        </Group>
        <Group title="Waiting for review">
          {waiting.length ? (
            waiting.map((article) => {
              const site = db.sites.find((item) => item.id === article.siteId);
              return (
                <RowLink
                  key={article.id}
                  href={`/pipeline/${article.id}`}
                  title={article.title}
                  sub={`${site?.name ?? "Website"} · ${statusLabel[article.status]}`}
                  aside={formatWhen(article.updatedAt)}
                />
              );
            })
          ) : (
            <Empty title="The queue is clear" body="New drafts from the agent or Drive land here before anyone approves them." />
          )}
        </Group>
        <Group title="Recent">
          {db.logs.slice(0, 6).map((entry) => (
            <div className="row" key={entry.id}>
              <span className="row-main">
                <span className="row-title">
                  {entry.action} · {entry.target}
                </span>
                <span className="row-sub">
                  {entry.actor} · {formatWhen(entry.at)}
                </span>
              </span>
            </div>
          ))}
        </Group>
      </div>
    </div>
  );
}
