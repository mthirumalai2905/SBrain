import { slugify } from "./format";
import { codeArticleChange, visibleParagraphs, type CodeFile } from "./code-agent";

export interface PublishDraft {
  siteId: string;
  intentId: string;
  section: string;
  title: string;
  body: string;
  design: string;
  author?: string;
  publishing: boolean;
  sources: Record<string, string>;
  now?: Date;
}

const registryPaths = new Set([
  "src/lib/posts.ts",
  "lib/blog.ts",
  "src/content/articles.ts",
  "src/content/chronicles.ts",
  "src/app/news/[slug]/page.tsx",
]);

export function knownSlugs(source: string) {
  return [...source.matchAll(/\bslug:\s*["']([a-z0-9-]+)["']/g)].map((match) => match[1] ?? "");
}

export function sourcePath(section: string, title: string) {
  const segment = section.replace(/^\/+|\/+$/g, "") || "source";
  return `brain/sources/${segment}/${slugify(title)}.md`;
}

export function sourceMarkdown(input: { title: string; body: string; author?: string }) {
  const lines = [`# ${input.title.trim()}`, ""];
  const author = input.author?.trim();
  if (author) lines.push(`Author: ${author}`, "");
  lines.push(input.body.trim(), "", "Source copy kept by Brain. The website reads the code files in this pull request.", "");
  return lines.join("\n");
}

function mentionsSlug(source: string, slug: string) {
  return new RegExp(`["'\`][^"'\`]*/?${slug}["'\`]`).test(source);
}

function derivedList(source: string) {
  const importsRegistry = /import\s*\{[^}]*\b(posts|articles|chronicles)\b[^}]*\}/.test(source);
  return importsRegistry && /\.map\(/.test(source);
}

export function patchSlugLists(sources: Record<string, string>, slug: string, known: string[]) {
  const files: CodeFile[] = [];
  const usable = known.filter((item) => item && item !== slug);
  if (usable.length < 2) return files;
  for (const [path, source] of Object.entries(sources)) {
    if (registryPaths.has(path) || path.endsWith("Article.ts") || path.startsWith("brain/sources/")) continue;
    if (derivedList(source)) continue;
    const present = usable.filter((item) => mentionsSlug(source, item));
    if (present.length < 2 || mentionsSlug(source, slug)) continue;
    const next = insertSlug(source, slug, present);
    if (next && next !== source) files.push({ path, content: next });
  }
  return files;
}

function insertSlug(source: string, slug: string, known: string[]) {
  for (const item of known) {
    const match = new RegExp(`(["'\`])([^"'\`]*/)?${item}\\1`).exec(source);
    if (!match) continue;
    const quote = match[1] ?? '"';
    const prefix = match[2] ?? "";
    const lineStart = source.lastIndexOf("\n", match.index) + 1;
    const indent = /^[ \t]*/.exec(source.slice(lineStart))?.[0] ?? "";
    const nl = source.includes("\r\n") ? "\r\n" : "\n";
    const insertion = `${quote}${prefix}${slug}${quote},${nl}${indent}`;
    return source.slice(0, match.index) + insertion + source.slice(match.index);
  }
  return "";
}

function insertPoint(source: string) {
  const main = /<main\b[^>]*>/.exec(source);
  if (main) return main.index + main[0].length;
  const article = /<article\b[^>]*>/.exec(source);
  if (article) return article.index + article[0].length;
  const returned = /return\s*(?:\(\s*)?</.exec(source);
  if (!returned) return -1;
  const open = source.indexOf("<", returned.index);
  const tag = /<([A-Za-z][\w.]*)\b[^>]*>/.exec(source.slice(open));
  if (!tag || tag[0].endsWith("/>")) return -1;
  return open + tag[0].length;
}

function pageBlock(title: string, body: string, design: string) {
  const sentence = design.replace(/\s+/g, " ").split(". ")[0]?.trim() || "Keep this website's existing theme and layout.";
  const copy = visibleParagraphs(title, body).slice(0, 8);
  const lines = [
    `      {/* Site prompt: ${sentence.slice(0, 180)}. */}`,
    `      <section aria-label={${JSON.stringify(title.trim())}}>`,
    `        <h2>{${JSON.stringify(title.trim())}}</h2>`,
  ];
  for (const paragraph of copy) lines.push(`        <p>{${JSON.stringify(paragraph)}}</p>`);
  lines.push("      </section>");
  return lines.join("\n");
}

export function patchPage(sources: Record<string, string>, input: { title: string; body: string; design: string }) {
  const title = input.title.trim();
  const ranked = Object.entries(sources).sort((left, right) => pageRank(right[0], right[1]) - pageRank(left[0], left[1]));
  for (const [path, source] of ranked) {
    if (!path.endsWith(".tsx") && !path.endsWith(".jsx")) continue;
    if (source.includes(`<h2>{${JSON.stringify(title)}}</h2>`)) {
      return { ok: false as const, error: "That title is already on this page. The pull request stays closed." };
    }
    const at = insertPoint(source);
    if (at < 0) continue;
    const nl = source.includes("\r\n") ? "\r\n" : "\n";
    const content = `${source.slice(0, at)}${nl}${pageBlock(title, input.body, input.design)}${source.slice(at)}`;
    return { ok: true as const, files: [{ path, content }] };
  }
  return { ok: false as const, error: "I couldn't find the page this path renders. The pull request stays closed." };
}

function pageRank(path: string, source: string) {
  let score = 0;
  if (/<main\b|<article\b/.test(source)) score += 5;
  if (path.endsWith("/page.tsx") || path.endsWith("/page.jsx")) score += 3;
  if (insertPoint(source) >= 0) score += 1;
  return score;
}

function cap(files: CodeFile[]) {
  const unique: CodeFile[] = [];
  for (const file of files) {
    if (unique.some((item) => item.path === file.path)) continue;
    unique.push(file);
  }
  if (unique.length <= 12) return unique;
  const source = unique.filter((file) => file.path.startsWith("brain/sources/"));
  const code = unique.filter((file) => !file.path.startsWith("brain/sources/"));
  return [...code.slice(0, 11), ...source.slice(0, 1)];
}

export function applyPublish(input: PublishDraft): { ok: true; files: CodeFile[]; notes: string[] } | { ok: false; error: string } {
  const notes: string[] = [];
  const source = { path: sourcePath(input.section, input.title), content: sourceMarkdown(input) };
  if (input.publishing) {
    const coded = codeArticleChange({
      siteId: input.siteId,
      title: input.title,
      body: input.body,
      design: input.design,
      sources: input.sources,
      now: input.now,
      author: input.author,
      section: input.section,
    });
    if (!coded.ok) return coded;
    const registry = Object.entries(input.sources).find(([path]) => registryPaths.has(path) && path.endsWith(".ts"));
    const slugs = registry ? knownSlugs(registry[1]) : [];
    const lists = patchSlugLists(input.sources, slugify(input.title), slugs);
    if (lists.length) notes.push(`Patch agent updated ${lists.map((file) => file.path).join(", ")}.`);
    const untouched = Object.keys(input.sources).filter((path) => derivedList(input.sources[path] ?? "") && !coded.files.some((file) => file.path === path));
    if (untouched.length) notes.push("A list that already renders the article registry was left unchanged.");
    notes.push("The markdown file is the source copy. The website reads the code files.");
    return { ok: true, files: cap([...coded.files, ...lists, source]), notes };
  }
  const page = patchPage(input.sources, input);
  if (!page.ok) return page;
  notes.push("Patch agent wrote the copy into the page this path renders.");
  notes.push("The markdown file is the source copy. The website reads the code files.");
  return { ok: true, files: cap([...page.files, source]), notes };
}
