import { slugify } from "./format";
import type { Site } from "./types";

export interface IntentSpec {
  id: string;
  label: string;
  match: RegExp;
  rule: string;
  paths(site: Site): string[];
  documentFile?(input: { site: Site; title: string; body: string; section?: string }): { ok: true; path: string; content: string } | { ok: false; error: string };
}

function publishingPaths(site: Site) {
  return site.sections.filter((section) => section.kind === "news" || section.kind === "journal").map((section) => section.path);
}

function sitePaths(site: Site) {
  return site.sections.map((section) => section.path);
}

function placeDocument(input: { site: Site; title: string; body: string; section?: string }, allowed: string[]) {
  const section = input.section?.trim() || (allowed.length === 1 ? allowed[0] : "");
  if (!allowed.length) return { ok: false as const, error: `${input.site.name} has no path for this intent. The pull request stays closed.` };
  if (!section || !allowed.includes(section)) return { ok: false as const, error: "Choose one path this intent is allowed to use." };
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) return { ok: false as const, error: "A document needs a title and a body." };
  const segment = section.replace(/^\/+/, "").replace(/\/+$/, "");
  return { ok: true as const, path: `${segment}/${slugify(title)}.md`, content: `# ${title}\n\n${body}` };
}

export const intents: IntentSpec[] = [
  {
    id: "article",
    label: "Article",
    match: /\b(article|articles|post|journal|news)\b/i,
    rule: "Add or edit an article. Keep the existing theme, components, and layout.",
    paths: publishingPaths,
    documentFile: (input) => placeDocument(input, publishingPaths(input.site)),
  },
  {
    id: "content",
    label: "Content",
    match: /\b(content|copy|wording)\b/i,
    rule: "Edit the copy on the named paths. Do not change layout, theme, or components.",
    paths: sitePaths,
  },
  {
    id: "revamp",
    label: "Revamp",
    match: /\b(revamp|redesign|restyle)\b/i,
    rule: "Change layout and visual treatment using only this site's design rules. Do not import components, fonts, or theme from another site.",
    paths: sitePaths,
  },
];

export type IntentId = (typeof intents)[number]["id"];

export function intentById(id: string) {
  return intents.find((intent) => intent.id === id) ?? null;
}

export function intentLabels() {
  return intents.map((intent) => intent.label).join(", ");
}

export interface IntentChoice {
  id: string;
  label: string;
  paths: { siteId: string; path: string; label: string }[];
}

export function intentChoices(sites: Site[]): IntentChoice[] {
  return intents.map((intent) => ({
    id: intent.id,
    label: intent.label,
    paths: sites.flatMap((site) =>
      intent.paths(site).map((path) => ({
        siteId: site.id,
        path,
        label: site.sections.find((section) => section.path === path)?.label || path,
      })),
    ),
  }));
}
