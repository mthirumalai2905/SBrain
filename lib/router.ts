import type { DB, Outcome } from "./types";
import { intentById, intentLabels, intents, type IntentId } from "./intents";
import { siteById } from "./workflow";

export function briefProse(text: string) {
  return text.replace(/(?:^|\n)file:\s*[^\n`]*\n+```[^\n]*\n[\s\S]*?```/gi, "\n");
}

export function namedSiteIds(text: string) {
  const prose = briefProse(text);
  const folded = prose.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const synx = /\bsynx\b|\bsnx\b/i.test(prose) || folded.includes("snxlp");
  const realtimeweb = /\breal[-\s]?time\s+web\b|\brealtimeweb\b|\brtw\b/i.test(prose) || folded.includes("therealweb");
  const skalle = /\bskalle\b/i.test(prose) || folded.includes("skalleailp") || folded.includes("skallealp") || folded.includes("skallelp");
  const morph = folded.includes("morphspace") || (/\bmorph(?:\s+space|\.space)?\b/i.test(prose) && !synx);
  return [synx ? "synx" : "", realtimeweb ? "realtimeweb" : "", skalle ? "skalle" : "", morph ? "morph" : ""].filter(Boolean);
}

export function namedIntents(text: string): IntentId[] {
  const prose = briefProse(text);
  const hits = intents.filter((intent) => intent.match.test(prose));
  const writing = /\b(write|draft|compose|new)\b.{0,48}\b(article|journal|news|post)\b/i.test(prose);
  const revamp = hits.some((intent) => intent.id === "revamp");
  const chosen = revamp && !writing ? hits.filter((intent) => intent.id !== "article") : hits;
  return chosen.map((intent) => intent.id);
}

export function routeChange(db: DB, text: string, hints?: { siteId?: string; intentId?: string }): Outcome<{ siteId: string; intentId: IntentId }> {
  const siteHint = hints?.siteId?.trim() ?? "";
  const intentHint = hints?.intentId?.trim() ?? "";
  let siteId = "";
  if (siteHint) {
    if (!siteById(db, siteHint)) return { ok: false, error: "That website is not in Brain." };
    siteId = siteHint;
  } else {
    const sites = namedSiteIds(text);
    if (sites.length === 0) return { ok: false, error: "Name one website: Synx, Real Time Web, Morph Space, or Skalle AI." };
    if (sites.length > 1) return { ok: false, error: "Name one website so the change stays on the right one." };
    siteId = sites[0] ?? "";
  }
  if (intentHint) {
    const spec = intentById(intentHint);
    if (!spec) return { ok: false, error: "That intent is not registered." };
    const site = siteById(db, siteId);
    return { ok: true, message: site ? `Routed to ${site.name} (${spec.label}).` : "Routed.", value: { siteId, intentId: spec.id } };
  }
  const found = namedIntents(text);
  if (found.length !== 1) {
    return {
      ok: false,
      error: found.length ? "Name one intent so the change stays on one route." : `Name one intent: ${intentLabels()}.`,
    };
  }
  const spec = intentById(found[0]);
  const site = siteById(db, siteId);
  return {
    ok: true,
    message: site && spec ? `Routed to ${site.name} (${spec.label}).` : "Routed.",
    value: { siteId, intentId: found[0] },
  };
}
