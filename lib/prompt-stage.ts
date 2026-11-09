import { createHash } from "crypto";
import type { DB, Outcome } from "./types";
import { canEdit } from "./rbac";
import { intentById, type IntentId } from "./intents";
import { briefProse, namedIntents, namedSiteIds, routeChange } from "./router";
import { siteById } from "./workflow";
import type { PublicUser } from "./types";

export type Intent = IntentId;
export { namedIntents, namedSiteIds, routeChange };

export interface PromptSeal {
  siteId: string;
  intent: Intent;
  design: string;
  allowedPaths: string[];
  prompt: string;
  stamp: string;
}

function asksToOpenPull(prose: string) {
  return /\b(open|raise|riase|raies|rase|create|make|push)\b.{0,40}\b(pull requests?|\bprs?\b)\b/i.test(prose);
}

export function isRepoQuestion(text: string) {
  const prose = briefProse(text);
  if (/\b(write|draft|compose)\b/i.test(prose) && /\b(article|journal|news|post)\b/i.test(prose)) return false;
  const aboutRepo = /\b(commits?|pull requests?|\bprs?\b|branch(es)?|repositor(y|ies)|\brepos?\b)\b/i.test(prose);
  if (!aboutRepo) return false;
  if (asksToOpenPull(prose) && !/\b(what|which|list|show|tell|any|latest|last|recent)\b/i.test(prose)) return false;
  return /\b(what|whats|what's|when|who|which|tell|show|list|latest|last|recent|newest|status|history|waht|wat|canu|can you|could you)\b/i.test(prose);
}

export function isCodePush(text: string) {
  const prose = briefProse(text);
  if (isRepoQuestion(prose)) return false;
  return (
    /\b(push|implement|revamp|redesign)\b/i.test(prose) ||
    asksToOpenPull(prose) ||
    /\bcommit\b.{0,40}\b(change|file|article|content|this|that|it)\b/i.test(prose) ||
    /\b(change|update)\b.{0,48}\b(design|theme|layout|component|code)\b/i.test(prose)
  );
}

function stampFor(siteId: string, intent: IntentId, design: string, allowedPaths: string[], brief: string) {
  return createHash("sha256")
    .update(JSON.stringify({ siteId, intent, design, allowedPaths, brief }))
    .digest("hex");
}

function renderPrompt(siteName: string, siteId: string, intent: IntentId, rule: string, design: string, allowedPaths: string[], brief: string) {
  return [
    `Site: ${siteId}`,
    `Intent: ${intent}`,
    "Design:",
    design,
    "Paths:",
    ...allowedPaths,
    `Rule: ${rule} Edit only ${siteName}. Do not reuse another site's theme, components, or routes.`,
    "Brief:",
    brief.trim(),
  ].join("\n");
}

export function stageCodePush(db: DB, brief: string, actor: PublicUser, hints?: { siteId?: string; intentId?: string }): Outcome<PromptSeal> {
  const text = brief.trim();
  if (!text) return { ok: false, error: "Write the brief before a code push." };
  if (!canEdit(actor.role)) return { ok: false, error: "Only an editor or owner can prepare a code push." };
  const routed = routeChange(db, text, hints);
  if (!routed.ok) return routed;
  const site = siteById(db, routed.value.siteId);
  if (!site) return { ok: false, error: "That website is not in Brain." };
  const spec = intentById(routed.value.intentId);
  if (!spec) return { ok: false, error: "That intent is not registered." };
  const design = site.formatting.trim();
  if (!design) return { ok: false, error: `${site.name} has no design rules, so the push stays closed.` };
  const intent = spec.id;
  const allowedPaths = spec.paths(site);
  if (!allowedPaths.length) return { ok: false, error: `${site.name} has no path for this intent. The push stays closed.` };
  const others = db.sites.filter((item) => item.id !== site.id);
  if (others.some((item) => item.formatting.trim() === design)) {
    return { ok: false, error: "The design rules are not unique to this site. The push stays closed." };
  }
  const prompt = renderPrompt(site.name, site.id, intent, spec.rule, design, allowedPaths, text);
  for (const other of others) {
    if (other.formatting.trim() && prompt.includes(other.formatting.trim())) {
      return { ok: false, error: "The prompt includes another site's design rules. The push stays closed." };
    }
  }
  return {
    ok: true,
    message: `Prompt sealed for ${site.name} (${intent}). No repository was changed.`,
    value: {
      siteId: site.id,
      intent,
      design,
      allowedPaths,
      prompt,
      stamp: stampFor(site.id, intent, design, allowedPaths, text),
    },
  };
}

export function assertSealedPush(seal: PromptSeal, brief: string) {
  const expected = stampFor(seal.siteId, seal.intent, seal.design, seal.allowedPaths, brief.trim());
  if (expected !== seal.stamp) return { ok: false as const, error: "The sealed prompt does not match this brief. The push stays closed." };
  if (!seal.prompt.startsWith(`Site: ${seal.siteId}\nIntent: ${seal.intent}\n`)) {
    return { ok: false as const, error: "The sealed prompt is for a different site or intent. The push stays closed." };
  }
  return { ok: true as const, message: "The sealed prompt matches this brief." };
}
