import { randomUUID } from "crypto";
import type { AgentRun, AgentStep, DB, PublicUser } from "./types";
import { canEdit, canOperate, canRecordPublication, canReview, canRollback, statusLabel } from "./rbac";
import { createArticle, rollbackArticle, siteById, transitionArticle, addLog } from "./workflow";
import { normalTitle } from "./format";
import { diagnose, findingSummary } from "./diagnose";
import type { Probe } from "./types";
import { applyPlan, type Plan } from "./harness/apply";
import { redact } from "./harness/redact";
import { isCodePush } from "./prompt-stage";
import { prepareCodePush } from "./pull-request";

function step(tool: string, summary: string, ok: boolean): AgentStep {
  return { id: randomUUID(), tool, summary, ok };
}

function detectSite(db: DB, text: string) {
  const synx = /\bsynx\b/i.test(text);
  const rtw = /\breal[-\s]?time\s+web\b|\brealtimeweb\b|\brtw\b/i.test(text);
  const skalle = /\bskalle\b/i.test(text);
  const morph = /\bmorph(?:\s+space|\.space)?\b/i.test(text);
  const ids = [
    synx ? "synx" : "",
    rtw ? "realtimeweb" : "",
    skalle ? "skalle" : "",
    morph && !synx ? "morph" : "",
  ].filter(Boolean);
  if (ids.length > 1) return { error: "Name one website so the change stays on the right one." };
  if (ids.length === 1) return { site: siteById(db, ids[0]) };
  return { site: null };
}

function extractTitle(text: string) {
  const quoted = /[“"]([^”"]{2,180})[”"]/.exec(text);
  if (quoted) return quoted[1].trim();
  const titled = /\b(?:titled|called|named)\s+(.+)$/i.exec(text);
  if (titled) return titled[1].replace(/[.?!]$/, "").trim();
  return "";
}

function extractUrl(text: string) {
  const match = /https?:\/\/[^\s)]+/i.exec(text);
  return match ? match[0] : "";
}

function defaultSection(db: DB, siteId: string) {
  const site = siteById(db, siteId);
  if (!site) return "";
  if (siteId === "synx") return "/news";
  if (siteId === "realtimeweb") return "/blog";
  if (siteId === "skalle") return "/articles";
  return site.sections[0]?.path ?? "";
}

function sectionFromText(db: DB, siteId: string, text: string) {
  const site = siteById(db, siteId);
  if (!site) return defaultSection(db, siteId);
  const found = site.sections.find((section) => {
    const label = section.label.toLowerCase();
    return text.toLowerCase().includes(label) || text.toLowerCase().includes(section.path.toLowerCase());
  });
  return found?.path ?? defaultSection(db, siteId);
}

function articlesMatching(db: DB, query: string, siteId?: string | null) {
  const key = normalTitle(query);
  const pool = db.articles.filter((article) => !siteId || article.siteId === siteId);
  if (!key) return pool;
  const exact = pool.filter((article) => normalTitle(article.title) === key);
  if (exact.length) return exact;
  return pool.filter((article) => normalTitle(article.title).includes(key) || key.includes(normalTitle(article.title)));
}

function remember(db: DB, run: AgentRun) {
  const safe: AgentRun = {
    ...run,
    instruction: redact(run.instruction),
    reply: redact(run.reply),
    task: redact(run.task || run.instruction),
    steps: run.steps.map((item) => ({ ...item, summary: redact(item.summary) })),
  };
  db.runs.unshift(safe);
  db.runs = db.runs.slice(0, 40);
  addLog(db, {
    kind: "agent",
    actor: safe.actor,
    action: "Instruction",
    target: safe.instruction.slice(0, 80),
    detail: safe.reply,
  });
  return safe;
}

export function instructionNeedsProbe(instruction: string) {
  return (
    /\b(health|uptime|certificate|ssl|diagnos)/i.test(instruction) ||
    /\b(check|probe)\b.{0,40}\b(site|sites|uptime|pages?)\b/i.test(instruction)
  );
}

export function recordProbes(db: DB, probes: Probe[], actor: string) {
  for (const probe of probes) {
    const index = db.probes.findIndex((item) => item.url === probe.url);
    if (index >= 0) db.probes[index] = probe;
    else db.probes.push(probe);
  }
  const healthy = probes.filter((probe) => probe.ok).length;
  addLog(db, {
    kind: "health",
    actor,
    action: "Checked",
    target: "Public websites",
    detail: `${healthy} of ${probes.length} URLs returned a healthy response. The VPS was not accessed.`,
  });
}

export function recordAgentRun(db: DB, instruction: string, actor: PublicUser, reply: string, steps: AgentStep[], task = instruction) {
  const run: AgentRun = {
    id: randomUUID(),
    at: new Date().toISOString(),
    actor: actor.name,
    actorId: actor.id,
    instruction,
    reply,
    steps,
    task,
  };
  return remember(db, run);
}

export function executeAgent(db: DB, instruction: string, actor: PublicUser, probes: Probe[] | null, plan: Plan | null = null): AgentRun {
  const text = instruction.trim();
  if (isCodePush(text)) {
    const prepared = prepareCodePush(db, text, actor);
    const steps: AgentStep[] = [step("prompt_stage", prepared.promptOk ? "Prompt sealed for one site." : prepared.error, prepared.promptOk)];
    if (prepared.promptOk) steps.push(step("open_pull_request", prepared.pull ? "Ready to open a pull request." : prepared.error, Boolean(prepared.pull)));
    const reply = prepared.pull
      ? `Prompt sealed for ${prepared.pull.siteId}. A pull request is ready for ${prepared.pull.owner}/${prepared.pull.repo}.`
      : prepared.error;
    return recordAgentRun(db, text, actor, reply, steps);
  }
  if (plan) {
    if (probes) recordProbes(db, probes, actor.name);
    const applied = applyPlan(db, text, actor, probes, plan);
    const run: AgentRun = {
      id: randomUUID(),
      at: new Date().toISOString(),
      actor: actor.name,
      actorId: actor.id,
      instruction: text,
      reply: applied.reply,
      steps: applied.steps,
    };
    return remember(db, run);
  }
  const steps: AgentStep[] = [];
  const sitePick = detectSite(db, text);
  const site = "site" in sitePick ? sitePick.site : null;
  const siteError = "error" in sitePick ? sitePick.error : "";
  const wantsHealth =
    /\b(health|uptime|certificate|ssl|diagnos)/i.test(text) ||
    /\b(check|probe)\b.{0,40}\b(site|sites|uptime|pages?)\b/i.test(text);
  const wantsPublish = /\bpublish\b/i.test(text);
  const wantsRecord = /\brecord\b/i.test(text) && /\burl\b/i.test(text);
  const wantsRollback = /\b(roll\s*back|restore)\b/i.test(text);
  const wantsApprove = /\bapprove\b/i.test(text);
  const wantsDraft = /\b(draft|write|create|compose)\b/i.test(text);
  const wantsList = /\b(list|show|what|which|waiting|queue|pipeline)\b/i.test(text);
  let reply = "Say which website, and whether to draft, approve, roll back, or check health. Live sites stay unchanged.";

  if (!text) {
    reply = "Write an instruction first.";
  } else if (siteError && (wantsDraft || wantsApprove || wantsRollback)) {
    reply = siteError;
    steps.push(step("resolve_site", siteError, false));
  } else if (wantsHealth) {
    if (!canOperate(actor.role)) {
      reply = "Health checks are limited to owners and operators.";
      steps.push(step("probe_health", reply, false));
    } else if (!probes) {
      reply = "The health check did not run.";
      steps.push(step("probe_health", reply, false));
    } else {
      recordProbes(db, probes, actor.name);
      const summary = probes
        .map((probe) => `${probe.url} ${probe.ok ? `HTTP ${probe.status} in ${probe.ms} ms` : probe.error || `HTTP ${probe.status}`}`)
        .join(". ");
      steps.push(step("probe_health", summary, probes.every((probe) => probe.ok)));
      const findings = diagnose(db).filter((finding) => finding.id !== "no-probes");
      steps.push(step("diagnose", findingSummary(findings), !findings.some((finding) => finding.severity !== "info")));
      reply = `${summary}. ${findingSummary(findings)} No recovery was run.`;
    }
  } else if (wantsPublish && !wantsRecord) {
    reply =
      "Publishing to the live websites is blocked. No connector is configured, and Brain did not contact them. An owner can record a URL after the existing site is updated by its own process.";
    steps.push(step("publish", reply, false));
  } else if (wantsRecord) {
    const url = extractUrl(text);
    const title = extractTitle(text);
    const matches = articlesMatching(db, title, site?.id);
    const article = matches.length === 1 ? matches[0] : db.articles.find((item) => item.status === "approved");
    if (!canRecordPublication(actor.role)) {
      reply = "Only an owner can record a published URL.";
      steps.push(step("record_publication", reply, false));
    } else if (!article || matches.length > 1) {
      reply = "Name the approved article and include the https URL to record.";
      steps.push(step("record_publication", reply, false));
    } else {
      const result = transitionArticle(db, article.id, "published", actor, "Recorded from the agent.", url);
      reply = result.ok ? result.message : result.error;
      steps.push(step("record_publication", reply, result.ok));
    }
  } else if (wantsRollback) {
    const title = extractTitle(text) || text.replace(/\b(roll\s*back|restore|please|the|article|on|for)\b/gi, " ").trim();
    const matches = articlesMatching(db, title, site?.id);
    if (!canRollback(actor.role)) {
      reply = "Only an editor or owner can roll back.";
      steps.push(step("rollback_article", reply, false));
    } else if (matches.length !== 1) {
      reply = matches.length ? "More than one article matches. Use the full title in quotes." : "No stored article matches that title.";
      steps.push(step("rollback_article", reply, false));
    } else {
      const article = matches[0];
      const version = article.versions.length > 1 ? article.versions[article.versions.length - 2] : null;
      if (!version) {
        reply = `“${article.title}” has no earlier version.`;
        steps.push(step("rollback_article", reply, false));
      } else {
        const result = rollbackArticle(db, article.id, version.id, actor);
        reply = result.ok ? result.message : result.error;
        steps.push(step("rollback_article", reply, result.ok));
      }
    }
  } else if (wantsApprove) {
    const title = extractTitle(text);
    const waiting = db.articles.filter(
      (article) => article.status === "review_required" && (!site || article.siteId === site.id),
    );
    const matches = title ? articlesMatching(db, title, site?.id).filter((article) => article.status === "review_required") : waiting;
    if (!canReview(actor.role)) {
      reply = "Only a reviewer or owner can approve.";
      steps.push(step("approve_article", reply, false));
    } else if (matches.length !== 1) {
      reply = matches.length
        ? "More than one article is waiting. Put the title in quotes."
        : "Nothing matching that title is in Review Required.";
      steps.push(step("approve_article", reply, false));
    } else {
      const result = transitionArticle(db, matches[0].id, "approved", actor, "Approved from the agent.");
      reply = result.ok ? result.message : result.error;
      steps.push(step("approve_article", reply, result.ok));
    }
  } else if (wantsDraft) {
    if (!site) {
      reply = "Name the website: Synx, Real Time Web, Morph Space, or Skalle AI.";
      steps.push(step("create_article", reply, false));
    } else if (!canEdit(actor.role)) {
      reply = "Only an editor or owner can draft articles.";
      steps.push(step("create_article", reply, false));
    } else {
      const title = extractTitle(text);
      if (!title) {
        reply = "What should the article be about?";
        steps.push(step("create_article", reply, false));
      } else {
        const section = sectionFromText(db, site.id, text);
        const body = [
          title,
          "",
          "Draft prepared in Brain. It has not been sent to the live website.",
          "",
          `Instruction: ${text}`,
        ].join("\n");
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
        reply = result.ok ? result.message : result.error;
        steps.push(step("create_article", reply, result.ok));
        if (result.ok) {
          steps.push(
            step(
              "format_article",
              `Placed in ${result.article.section} using the observed path style. Status: ${statusLabel[result.article.status]}.`,
              result.article.status !== "failed",
            ),
          );
        }
      }
    }
  } else if (wantsList) {
    const relevant = db.articles.filter((article) => !site || article.siteId === site.id);
    const waiting = relevant.filter((article) => article.status === "review_required");
    const lines = db.sites.map((site) => `${site.name} (${site.publicUrl})`).join(". ");
    if (/\bsites?\b/i.test(text) && !/\barticle|review|pipeline|waiting\b/i.test(text)) {
      reply = lines + ". Publishing connectors are not configured.";
      steps.push(step("list_sites", reply, true));
    } else if (!waiting.length) {
      reply = "Nothing is waiting for review.";
      steps.push(step("list_articles", reply, true));
    } else {
      reply = waiting
        .map((article) => {
          const site = siteById(db, article.siteId);
          return `${article.title} · ${site?.name ?? "Website"} · ${statusLabel[article.status]}`;
        })
        .join(". ");
      steps.push(step("list_articles", reply, true));
    }
  }

  const run: AgentRun = {
    id: randomUUID(),
    at: new Date().toISOString(),
    actor: actor.name,
    actorId: actor.id,
    instruction: text,
    reply,
    steps,
  };
  return remember(db, run);
}
