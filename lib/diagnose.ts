import type { DB } from "./types";
import { formatDay } from "./format";

export interface Finding {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  action: "probe" | "retry-jobs" | "none";
}

export function diagnose(db: DB): Finding[] {
  const findings: Finding[] = [];
  if (!db.probes.length) {
    findings.push({
      id: "no-probes",
      severity: "info",
      title: "Public sites have not been checked yet",
      detail: "A check requests the public pages and reads certificate dates. It does not sign in to the VPS.",
      action: "probe",
    });
  }

  for (const probe of db.probes) {
    const site = db.sites.find((item) => item.id === probe.siteId);
    const name = site?.name ?? probe.url;
    if (!probe.ok) {
      findings.push({
        id: `http-${probe.url}`,
        severity: probe.status === 0 ? "critical" : "warning",
        title: `${name} did not return a healthy page`,
        detail: probe.error
          ? `${probe.url} — ${probe.error}`
          : `${probe.url} returned HTTP ${probe.status} in ${probe.ms} ms.`,
        action: "probe",
      });
    } else if (probe.ms > 2500) {
      findings.push({
        id: `slow-${probe.url}`,
        severity: "warning",
        title: `${name} responded slowly`,
        detail: `${probe.url} returned HTTP ${probe.status} in ${probe.ms} ms.`,
        action: "probe",
      });
    }
    if (probe.certExpires) {
      const days = (Date.parse(probe.certExpires) - Date.now()) / 86_400_000;
      if (days < 0) {
        findings.push({
          id: `cert-${probe.url}`,
          severity: "critical",
          title: `Certificate expired for ${new URL(probe.url).host}`,
          detail: `It was valid until ${formatDay(probe.certExpires)}. Renewal stays on the existing host.`,
          action: "none",
        });
      } else if (days < 21) {
        findings.push({
          id: `cert-${probe.url}`,
          severity: "warning",
          title: `Certificate expires soon for ${new URL(probe.url).host}`,
          detail: `Valid until ${formatDay(probe.certExpires)}.`,
          action: "none",
        });
      }
    } else if (probe.certError && probe.ok) {
      findings.push({
        id: `cert-read-${probe.url}`,
        severity: "info",
        title: `Certificate date was not read for ${new URL(probe.url).host}`,
        detail: probe.certError,
        action: "none",
      });
    }
  }

  const failed = db.articles.filter((article) => article.status === "failed");
  if (failed.length) {
    findings.push({
      id: "failed-articles",
      severity: "warning",
      title: failed.length === 1 ? "1 article failed" : `${failed.length} articles failed`,
      detail: failed
        .slice(0, 3)
        .map((article) => article.title)
        .join(", "),
      action: "none",
    });
  }

  if (db.jobs.some((job) => job.status === "error")) {
    findings.push({
      id: "failed-jobs",
      severity: "warning",
      title: "A formatting job failed",
      detail: "Retry runs the job again inside Brain. It does not publish to a website.",
      action: "retry-jobs",
    });
  }

  return findings;
}

export function findingSummary(findings: Finding[]) {
  if (!findings.length) return "No issues showed up in the checks Brain can see.";
  return findings.map((finding) => `${finding.title}. ${finding.detail}`).join(" ");
}
