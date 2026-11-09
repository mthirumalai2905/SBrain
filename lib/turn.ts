import type { DB } from "./types";
import { intentLabels, type IntentId } from "./intents";
import { isCodePush, isRepoQuestion, namedIntents, namedSiteIds } from "./prompt-stage";
import { siteById } from "./workflow";
import { statusLabel } from "./rbac";

export interface PriorTurn {
  instruction: string;
  reply: string;
  task?: string;
}

export interface Turn {
  instruction: string;
  task: string;
  kind: "repo" | "list" | "write" | "retitle" | "push" | "chat";
  siteId: string;
  intentId: string;
  topic: string;
  articleName: string;
  pull: boolean;
  need: "" | "site" | "intent" | "topic";
}

const siteAliases: Record<string, string[]> = {
  synx: ["synx", "snx", "snxlp"],
  realtimeweb: ["realtimeweb", "realtmeweb", "rtw", "therealweb"],
  morph: ["morph", "morphspace"],
  skalle: ["skalle", "skalleai", "skalleailp", "skallealp", "skallelp"],
};

function folded(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function siteOnly(text: string) {
  const sites = namedSiteIds(text);
  if (sites.length !== 1) return "";
  const id = sites[0] ?? "";
  return siteAliases[id]?.includes(folded(text)) ? id : "";
}

function intentOnly(text: string) {
  if (!/^(article|content|revamp|redesign|restyle)$/i.test(text.trim())) return "";
  return namedIntents(text)[0] ?? "";
}

export function askedFor(reply: string): "" | "site" | "intent" | "topic" {
  if (/what should the article be about/i.test(reply)) return "topic";
  if (/name one intent/i.test(reply)) return "intent";
  if (/name one website/i.test(reply)) return "site";
  return "";
}

export function carriedTask(previous: PriorTurn | undefined, next: string): { instruction: string; task: string } {
  const instruction = next.trim();
  if (!previous) return { instruction, task: instruction };
  const pending = askedFor(previous.reply);
  const base = previous.task?.trim() || previous.instruction;
  const site = siteOnly(instruction);
  const intent = intentOnly(instruction);
  if (pending === "site" && site) return { instruction, task: `${base}\nWebsite: ${site}` };
  if (pending === "intent" && intent) return { instruction, task: `${base}\nIntent: ${intent}` };
  if (pending === "topic" && instruction && !site && !intent) return { instruction, task: `${base}\nTopic: ${instruction}` };
  return { instruction, task: instruction };
}

export function articleTopic(text: string) {
  const lined = /^Topic:\s*(.+)$/m.exec(text);
  if (lined) return lined[1].trim();
  const about = /\b(?:about|on|regarding)\s+(.+?)(?:\s+and\s+(?:then\s+)?(?:make|push|raise|riase|raies|rase|open|create)|\s+then\b|$)/i.exec(text);
  return about?.[1]?.replace(/[.?!]+$/, "").trim() ?? "";
}

export function existingArticleName(text: string) {
  const named = /\barticle of\s+(.+?)(?:\s+so\b|\s+and\s+i\b|$)/i.exec(text);
  return named?.[1]?.replace(/[.?!]+$/, "").trim() ?? "";
}

function hintedSite(task: string) {
  return /^Website:\s*(synx|realtimeweb|morph|skalle)\s*$/m.exec(task)?.[1] ?? "";
}

function hintedIntent(task: string) {
  return /^Intent:\s*(article|content|revamp)\s*$/m.exec(task)?.[1] ?? "";
}

export function needReply(need: "site" | "intent" | "topic") {
  if (need === "topic") return "What should the article be about?";
  if (need === "intent") return `Name one intent: ${intentLabels()}.`;
  return "Name one website: Synx, Real Time Web, Morph Space, or Skalle AI.";
}

export function titleFromTopic(topic: string) {
  const small = new Set(["a", "an", "the", "of", "and", "or", "to", "for", "in", "on", "is"]);
  return topic
    .trim()
    .replace(/[.?!]+$/, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      if (word.toLowerCase() === "ai") return "AI";
      if (index > 0 && small.has(word.toLowerCase())) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function articleCopy(topic: string, drafted?: { title?: string; body?: string } | null) {
  const title = titleFromTopic(topic);
  const words = topic
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3);
  const candidateTitle = drafted?.title?.trim() ?? "";
  const candidateBody = drafted?.body?.trim() ?? "";
  const hay = `${candidateTitle} ${candidateBody}`.toLowerCase();
  const grounded = words.filter((word) => hay.includes(word)).length >= Math.min(2, words.length);
  if (candidateTitle && candidateBody && candidateBody.length >= 80 && candidateBody.length <= 6000 && grounded) {
    return { title: candidateTitle.slice(0, 180), body: candidateBody };
  }
  return {
    title,
    body: [
      title,
      "",
      "This draft stays with the subject you named. It does not add names, numbers, or events that were not in the request.",
      "",
      "The live website is unchanged until someone reviews the pull request and merges it outside Brain.",
    ].join("\n"),
  };
}

export function groundedTitle(instruction: string, title: string) {
  const wanted = title.trim().toLowerCase();
  if (wanted.length < 2) return false;
  if (instruction.toLowerCase().includes(wanted)) return true;
  const words = wanted
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3 && !["synx", "real", "time", "web", "morph", "space", "skalle", "article", "about"].includes(word));
  if (!words.length) return false;
  const hay = instruction.toLowerCase();
  const hits = words.filter((word) => hay.includes(word));
  return hits.length >= Math.min(2, words.length) && hits.length / words.length >= 0.6;
}

export function classifyTask(task: string): Turn {
  const hinted = hintedSite(task);
  const sites = namedSiteIds(task);
  const siteId = hinted || (sites.length === 1 ? sites[0] ?? "" : "");
  const ambiguous = !hinted && sites.length > 1;
  const intentHint = hintedIntent(task);
  const intents = intentHint ? [intentHint] : namedIntents(task);
  const intentId = (intents.length === 1 ? intents[0] : "") as IntentId | "";
  const topic = articleTopic(task);
  const articleName = existingArticleName(task);
  const writing = /\b(write|draft|compose)\b/i.test(task) && /\b(article|journal|news|post)\b/i.test(task);
  const listing = /\blist articles\b/i.test(task);
  const pull = isCodePush(task);
  const retitle = Boolean(articleName) && /\bquestion mark\b/i.test(task) && /\b(title|article)\b/i.test(task);
  const base = { instruction: task, task, siteId, intentId, topic, articleName, pull, need: "" as Turn["need"] };
  if (isRepoQuestion(task)) return { ...base, kind: "repo" };
  if (listing && !writing) {
    return { ...base, kind: "list", need: siteId ? "" : "site", pull: false };
  }
  if (writing) {
    if (!topic) return { ...base, kind: "write", need: "topic" };
    if (!siteId || ambiguous) return { ...base, kind: "write", siteId: "", need: "site" };
    return { ...base, kind: "write", intentId: "article", pull };
  }
  if (retitle) {
    if (!siteId || ambiguous) return { ...base, kind: "retitle", siteId: "", need: "site" };
    return { ...base, kind: "retitle", intentId: intentId || "content" };
  }
  if (pull) {
    if (!siteId || ambiguous) return { ...base, kind: "push", siteId: "", need: "site" };
    if (intents.length !== 1) return { ...base, kind: "push", intentId: "", need: "intent" };
    return { ...base, kind: "push" };
  }
  return { ...base, kind: "chat", pull: false };
}

export function listArticles(db: DB, siteId: string) {
  const site = siteById(db, siteId);
  const rows = db.articles.filter((article) => article.siteId === siteId);
  if (!rows.length) return `${site?.name ?? "That website"} has no stored articles.`;
  return rows.map((article) => `${article.title} · ${site?.name ?? "Website"} · ${statusLabel[article.status]}`).join("\n");
}
