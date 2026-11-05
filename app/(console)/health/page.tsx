import type { Metadata } from "next";
import { CheckButton, RecoveryCard } from "@/components/health-actions";
import { PageHeader, Group, Empty } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { diagnose } from "@/lib/diagnose";
import { formatDay } from "@/lib/format";
import { liveDb } from "@/lib/live";
import { canOperate } from "@/lib/rbac";

export const metadata: Metadata = { title: "Health" };

export default async function HealthPage() {
  const user = await requireUser();
  const db = await liveDb();
  const findings = diagnose(db);
  const canRun = canOperate(user.role);

  return (
    <div>
      <PageHeader
        title="Health"
        lede="Availability, HTTP status, and certificates from the public URLs. CPU, memory, disk, Nginx, and databases are not visible without a host agent."
        actions={<CheckButton canRun={canRun} />}
      />
      <div className="stack">
        <Group title="Diagnostics" footer="Recommendations stay here until you explicitly authorise a local recovery. Brain will not open a shell on the server.">
          {findings.length ? (
            findings.map((finding) => (
              <div className="row" key={finding.id}>
                <span className="row-main">
                  <span className="row-title">{finding.title}</span>
                  <span className="row-sub">{finding.detail}</span>
                </span>
                <span className={`status-line status-${finding.severity === "critical" ? "failed" : finding.severity === "warning" ? "review_required" : "detected"}`}>
                  {finding.severity === "critical" ? "Critical" : finding.severity === "warning" ? "Warning" : "Info"}
                </span>
              </div>
            ))
          ) : (
            <Empty title="No issues in view" body="The public checks Brain has run did not show a problem." />
          )}
        </Group>
        {db.sites.map((site) => {
          const probes = db.probes.filter((probe) => probe.siteId === site.id);
          return (
            <Group key={site.id} title={site.name}>
              {site.checks.map((url) => {
                const probe = probes.find((item) => item.url === url);
                return (
                  <div className="row" key={url}>
                    <span className="row-main">
                      <span className="row-title">{url.replace("https://", "")}</span>
                      <span className="row-sub">
                        {probe
                          ? `${probe.ok ? `HTTP ${probe.status}` : probe.error || `HTTP ${probe.status}`} · ${probe.ms} ms${
                              probe.certExpires ? ` · certificate ${formatDay(probe.certExpires)}` : ""
                            }`
                          : "Not checked"}
                      </span>
                    </span>
                  </div>
                );
              })}
            </Group>
          );
        })}
        <Group title="Host" footer="These were not inspected. Installing a host agent would be a separate, approved change to the VPS.">
          {["CPU", "Memory", "Disk", "Nginx", "Application", "Database"].map((name) => (
            <div className="row" key={name}>
              <span className="row-main">
                <span className="row-title">{name}</span>
                <span className="row-sub">No agent</span>
              </span>
            </div>
          ))}
        </Group>
        <RecoveryCard canRun={canRun} canRetry={canRun} />
      </div>
    </div>
  );
}
