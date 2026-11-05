import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Group, Empty } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatWhen } from "@/lib/format";
import { liveDb } from "@/lib/live";
import type { LogEntry } from "@/lib/types";

export const metadata: Metadata = { title: "Logs" };

const kinds: Array<LogEntry["kind"] | "all"> = ["all", "content", "agent", "health", "drive", "auth", "system"];

export default async function LogsPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  await requireUser();
  const query = await searchParams;
  const db = await liveDb();
  const kind = kinds.find((item) => item === query.kind) ?? "all";
  const entries = db.logs.filter((entry) => kind === "all" || entry.kind === kind);

  return (
    <div>
      <PageHeader title="Logs" lede="Sign-ins, content changes, agent runs, health checks, and job retries." />
      <div className="segment filters">
        {kinds.map((item) => (
          <Link key={item} className={kind === item ? "on" : undefined} href={item === "all" ? "/logs" : `/logs?kind=${item}`}>
            {item === "all" ? "All" : item[0].toUpperCase() + item.slice(1)}
          </Link>
        ))}
      </div>
      <Group>
        {entries.length ? (
          entries.map((entry) => (
            <div className="row" key={entry.id}>
              <span className="row-main">
                <span className="row-title">
                  {entry.action} · {entry.target}
                </span>
                <span className="row-sub">
                  {entry.detail} · {entry.actor} · {formatWhen(entry.at)}
                </span>
              </span>
            </div>
          ))
        ) : (
          <Empty title="No entries" body="Actions in Brain will be recorded here." />
        )}
      </Group>
    </div>
  );
}
