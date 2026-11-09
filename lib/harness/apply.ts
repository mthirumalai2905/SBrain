import { randomUUID } from "crypto";
import type { AgentStep, DB, Probe, PublicUser } from "../types";
import { diagnose, findingSummary } from "../diagnose";
import { normalTitle } from "../format";
import { statusLabel } from "../rbac";
import { addLog, createArticle, defaultSectionFor, rollbackArticle, siteById, transitionArticle } from "../workflow";
import { auditEvent, auditLine, type AuditEvent } from "./log";
import { toolByName } from "./registry";
import { groundedTitle } from "../turn";

export interface ToolCall {
  name: string;
  input?: Record<string, string>;
}

export interface Plan {
  reply: string;
  tools: ToolCall[];
  dryRun: boolean;
}

function step(tool: string, summary: string, ok: boolean): AgentStep {
  return { id: randomUUID(), tool, summary, ok };
}

function field(input: Record<string, string> | undefined, key: string) {
  return (input?.[key] ?? "").trim();
}

function resolveSite(db: DB, text: string) {
  const value = text.toLowerCase();
  if (!value) return null;
  return (
    db.sites.find((site) => {
      if (value === site.id || value === site.slug || value === site.name.toLowerCase()) return true;
      if (site.id === "realtimeweb" && /real\s*time|realtimeweb|\brtw\b/.test(value)) return true;
      if (site.id === "morph" && /\bmorph\b/.test(value)) return true;
      if (site.id === "skalle" && /\bskalle\b/.test(value)) return true;
      if (site.id === "synx" && /\bsynx\b/.test(value)) return true;
      return false;
    }) ?? null
  );
}

function articlesNamed(db: DB, title: string, siteId?: string | null) {
  const key = normalTitle(title);
  const pool = db.articles.filter((article) => !siteId || article.siteId === siteId);
  if (!key) return pool;
  const exact = pool.filter((article) => normalTitle(article.title) === key);
  return exact.length ? exact : pool.filter((article) => normalTitle(article.title).includes(key));
}

function record(db: DB, event: AuditEvent) {
  const line = auditLine(event);
  addLog(db, {
    kind: "agent",
    actor: event.actor,
    action: event.tool,
    target: event.site || "Brain",
    detail: line,
  });
}

export function applyPlan(db: DB, instruction: string, actor: PublicUser, probes: Probe[] | null, plan: Plan): { reply: string; steps: AgentStep[] } {
  const steps: AgentStep[] = [];
  const runId = randomUUID();

  for (const call of plan.tools) {
    const started = Date.now();
    const tool = toolByName(call.name);
    const input = call.input ?? {};
    const site = resolveSite(db, field(input, "site") || instruction);
    const base = {
      timestamp: new Date().toISOString(),
      run_id: runId,
      actor: "agent" as const,
      site: site?.id ?? "",
      tool: call.name,
      input: JSON.stringify(input).slice(0, 500),
      retry_count: 0,
      approval_id: null,
    };

    const finish = (status: AuditEvent["status"], result: string, ok: boolean, error: string | null) => {
      const event = auditEvent({ ...base, result, status, duration_ms: Date.now() - started, error });
      record(db, event);
      steps.push(step(call.name, result, ok));
    };

    if (!tool) {
      finish("failed", `Unknown tool “${call.name}”.`, false, "Unknown tool.");
      continue;
    }
    if (tool.risk === "destructive") {
      finish(
        "blocked",
        "Publishing to the live websites is blocked. No connector is configured, and Brain did not contact them.",
        false,
        "Destructive tool blocked.",
      );
      continue;
    }
    if (!tool.allow(actor.role)) {
      finish("blocked", "Your role cannot use that tool.", false, "Permission denied.");
      continue;
    }
    if (plan.dryRun) {
      finish("dry_run", `Would run ${tool.name}. No change was made.`, true, null);
      continue;
    }

    if (tool.name === "echo") {
      finish("ok", field(input, "text") || instruction, true, null);
      continue;
    }
    if (tool.name === "health_ping") {
      finish("ok", "Brain is responding. This ping did not contact the live websites.", true, null);
      continue;
    }
    if (tool.name === "list_sites") {
      const result = db.sites.map((item) => `${item.name} (${item.publicUrl})`).join(". ");
      finish("ok", `${result}. Publishing connectors are not configured.`, true, null);
      continue;
    }
    if (tool.name === "list_articles") {
      const waitingOnly = /true|yes|waiting|review/i.test(field(input, "waiting"));
      const pool = db.articles.filter((article) => !site || article.siteId === site.id);
      const rows = (waitingOnly ? pool.filter((article) => article.status === "review_required") : pool).slice(0, 12);
      const result = rows.length
        ? rows
            .map((article) => {
              const owner = siteById(db, article.siteId);
              return `${article.title} · ${owner?.name ?? "Website"} · ${statusLabel[article.status]}`;
            })
            .join(". ")
        : waitingOnly
          ? "Nothing is waiting for review."
          : "No articles are stored yet.";
      finish("ok", result, true, null);
      continue;
    }
    if (tool.name === "probe_health") {
      if (!probes) {
        finish("failed", "The health check did not run.", false, "No probe result.");
        continue;
      }
      const result = probes
        .map((probe) => `${probe.url} ${probe.ok ? `HTTP ${probe.status} in ${probe.ms} ms` : probe.error || `HTTP ${probe.status}`}`)
        .join(". ");
      finish("ok", result, probes.every((probe) => probe.ok), null);
      continue;
    }
    if (tool.name === "diagnose") {
      const findings = diagnose(db).filter((finding) => finding.id !== "no-probes");
      finish("ok", findingSummary(findings), !findings.some((finding) => finding.severity !== "info"), null);
      continue;
    }
    if (tool.name === "create_article") {
      const title = field(input, "title");
      if (!site) {
        finish("failed", "Name the website: Synx, Real Time Web, Morph Space, or Skalle AI.", false, "Missing site.");
        continue;
      }
      if (!title) {
        finish("failed", "What should the article be about?", false, "Missing title.");
        continue;
      }
      if (!groundedTitle(instruction, title)) {
        finish("failed", "What should the article be about?", false, "The title was not in the instruction.");
        continue;
      }
      const section = field(input, "section") || defaultSectionFor(site.id);
      const body = field(input, "body") || `${title}\n\nDraft prepared in Brain. It has not been sent to the live website.\n\nInstruction: ${instruction}`;
      const result = createArticle(db, {
        siteId: site.id,
        title,
        body,
        section,
        author: actor.name,
        documentUrl: "",
        source: "agent",
        actor,
      });
      finish(result.ok ? "ok" : "failed", result.ok ? result.message : result.error, result.ok, result.ok ? null : result.error);
      continue;
    }
    if (tool.name === "approve_article") {
      const title = field(input, "title");
      const waiting = db.articles.filter((article) => article.status === "review_required" && (!site || article.siteId === site.id));
      const matches = title ? articlesNamed(db, title, site?.id).filter((article) => article.status === "review_required") : waiting;
      if (matches.length !== 1) {
        const result = matches.length ? "More than one article is waiting. Name the title." : "Nothing matching that title is in Review Required.";
        finish("failed", result, false, result);
        continue;
      }
      const result = transitionArticle(db, matches[0].id, "approved", actor, "Approved from the agent.");
      finish(result.ok ? "ok" : "failed", result.ok ? result.message : result.error, result.ok, result.ok ? null : result.error);
      continue;
    }
    if (tool.name === "rollback_article") {
      const title = field(input, "title");
      const matches = articlesNamed(db, title, site?.id);
      if (matches.length !== 1) {
        const result = matches.length ? "More than one article matches. Use the full title." : "No stored article matches that title.";
        finish("failed", result, false, result);
        continue;
      }
      const version = matches[0].versions.length > 1 ? matches[0].versions[matches[0].versions.length - 2] : null;
      if (!version) {
        finish("failed", `“${matches[0].title}” has no earlier version.`, false, "No version.");
        continue;
      }
      const result = rollbackArticle(db, matches[0].id, version.id, actor);
      finish(result.ok ? "ok" : "failed", result.ok ? result.message : result.error, result.ok, result.ok ? null : result.error);
      continue;
    }
    if (tool.name === "record_publication") {
      const title = field(input, "title");
      const url = field(input, "url");
      const matches = articlesNamed(db, title, site?.id);
      const article = matches.length === 1 ? matches[0] : null;
      if (!article) {
        finish("failed", "Name one approved article.", false, "Missing article.");
        continue;
      }
      const result = transitionArticle(db, article.id, "published", actor, "Recorded from the agent.", url);
      finish(result.ok ? "ok" : "failed", result.ok ? result.message : result.error, result.ok, result.ok ? null : result.error);
      continue;
    }

    finish("failed", "That tool is not available.", false, "Unhandled tool.");
  }

  const factual = steps.map((item) => item.summary).filter(Boolean);
  const reply = factual.length ? factual.join("\n\n") : plan.reply || "Nothing was changed.";
  return { reply, steps };
}
