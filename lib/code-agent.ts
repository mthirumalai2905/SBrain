import { slugify } from "./format";

export interface CodeFile {
  path: string;
  content: string;
}

export interface ArticleDraft {
  siteId: string;
  title: string;
  body: string;
  design: string;
  sources: Record<string, string>;
  now?: Date;
  author?: string;
  section?: string;
}

const boilerplate = new Set([
  "this draft stays with the subject you named. it does not add names, numbers, or events that were not in the request.",
  "the live website is unchanged until someone reviews the pull request and merges it outside brain.",
]);

function newline(source: string) {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

function insertAfter(source: string, marker: string, block: string) {
  const at = source.indexOf(marker);
  if (at < 0) return "";
  const end = at + marker.length;
  const nl = newline(source);
  return `${source.slice(0, end)}${nl}${block}${source.slice(end)}`;
}

export function visibleParagraphs(title: string, body: string) {
  const titleKey = title.trim().toLowerCase();
  const rows = body
    .replace(/^#\s+.*(?:\r?\n)+/, "")
    .split(/\n{2,}|\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && line.toLowerCase() !== titleKey && !boilerplate.has(line.toLowerCase()));
  return rows.length ? rows : [title.trim()];
}

function dek(rows: string[]) {
  const sentence = rows[0]?.split(/(?<=[.?!])\s/)[0] ?? "";
  return sentence.slice(0, 180);
}

function minutes(rows: string[]) {
  const words = rows.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function stamp(now: Date) {
  const month = now.toLocaleString("en", { month: "short", timeZone: "UTC" });
  const iso = now.toISOString().slice(0, 10);
  return { when: `${month} ${now.getUTCFullYear()}`, iso };
}

function names(slug: string) {
  const parts = slug.split("-").filter(Boolean);
  const head = parts[0]?.match(/^\d/) ? ["article", ...parts] : parts;
  const camel = head.map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))).join("");
  return { camel, blocks: `${camel}Blocks`, constant: `${head.join("_").toUpperCase()}_SLUG` };
}

function promptLine(design: string) {
  const sentence = design.replace(/\s+/g, " ").split(". ")[0]?.trim() || "Keep this website's existing theme and layout.";
  return `// Site prompt: ${sentence.slice(0, 180)}.`;
}

function hasSlug(source: string, slug: string) {
  return source.includes(`"${slug}"`) || source.includes(`'${slug}'`);
}

export function codeArticleChange(input: ArticleDraft): { ok: true; files: CodeFile[] } | { ok: false; error: string } {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) return { ok: false, error: "A published article needs a title and a body. The pull request stays closed." };
  const slug = slugify(title);
  const rows = visibleParagraphs(title, body);
  const when = stamp(input.now ?? new Date());
  if (input.siteId === "synx") return synx(input, slug, rows, when.when);
  if (input.siteId === "realtimeweb") return realtime(input, slug, rows, when.iso);
  if (input.siteId === "skalle") return skalle(input, slug, rows, when.iso);
  if (input.siteId === "morph") {
    return { ok: false, error: "Morph Space has no article publisher in its repository. A markdown file would not appear on the live site, so the pull request stays closed." };
  }
  return { ok: false, error: "That website has no code pattern for an article. The pull request stays closed." };
}

function synx(input: ArticleDraft, slug: string, rows: string[], when: string): { ok: true; files: CodeFile[] } | { ok: false; error: string } {
  const posts = input.sources["src/lib/posts.ts"] ?? "";
  const page = input.sources["src/app/news/[slug]/page.tsx"] ?? "";
  if (!posts || !page) return { ok: false, error: "Synx's article files could not be read. The pull request stays closed." };
  if (hasSlug(posts, slug)) return { ok: false, error: `Synx already has an article slug “${slug}”. The pull request stays closed.` };
  const id = names(slug);
  const summary = dek(rows);
  const post = [
    "  {",
    `    slug: ${JSON.stringify(slug)},`,
    `    name: ${JSON.stringify(input.author?.trim() || "Brain")},`,
    `    source: "Synx",`,
    `    category: "Articles",`,
    `    href: ${JSON.stringify(`/news/${slug}`)},`,
    `    title: ${JSON.stringify(input.title.trim())},`,
    `    dek: ${JSON.stringify(summary)},`,
    `    text: ${JSON.stringify(summary)},`,
    `    when: ${JSON.stringify(when)},`,
    `    photo: "/img/news-jobs-hero.jpg",`,
    `    image: "/img/news-jobs-hero.jpg",`,
    "  },",
  ].join(newline(posts));
  const nextPosts = insertAfter(posts, "export const posts: Post[] = [", post);
  const imported = `import { ${id.blocks}, ${id.constant} } from "@/lib/${id.camel}Article";`;
  const withImport = insertAfter(page, 'from "@/lib/raisingArticle";', imported);
  const nextPage = insertAfter(withImport, "const essays: Record<string, ArticleBlock[]> = {", `  [${id.constant}]: ${id.blocks},`);
  if (!nextPosts || !withImport || !nextPage) {
    return { ok: false, error: "Synx's article pattern has changed. The pull request stays closed." };
  }
  const blocks = rows.map((text) => `  { type: "p", text: ${JSON.stringify(text)} },`).join("\n");
  const module = [
    promptLine(input.design),
    "// Hero image is an existing repository file. Replace it before merge if this article needs its own picture.",
    'import type { ArticleBlock } from "@/lib/raisingArticle";',
    "",
    `export const ${id.constant} = ${JSON.stringify(slug)};`,
    "",
    `export const ${id.blocks}: ArticleBlock[] = [`,
    blocks,
    "];",
    "",
  ].join("\n");
  return {
    ok: true,
    files: [
      { path: `src/lib/${id.camel}Article.ts`, content: module },
      { path: "src/lib/posts.ts", content: nextPosts },
      { path: "src/app/news/[slug]/page.tsx", content: nextPage },
    ],
  };
}

function realtime(input: ArticleDraft, slug: string, rows: string[], date: string): { ok: true; files: CodeFile[] } | { ok: false; error: string } {
  const blog = input.sources["lib/blog.ts"] ?? "";
  if (!blog) return { ok: false, error: "Real Time Web's journal file could not be read. The pull request stays closed." };
  if (hasSlug(blog, slug)) return { ok: false, error: `Real Time Web already has an article slug “${slug}”. The pull request stays closed.` };
  const body = rows.map((text) => `      ${JSON.stringify(text)},`).join(newline(blog));
  const post = [
    "  {",
    `    ${promptLine(input.design)}`,
    `    slug: ${JSON.stringify(slug)},`,
    `    title: ${JSON.stringify(input.title.trim())},`,
    `    excerpt: ${JSON.stringify(dek(rows))},`,
    `    date: ${JSON.stringify(date)},`,
    `    category: "Essay",`,
    `    cover: "/blog/rtw-cyberpunk-08-server-canyon.png",`,
    `    coverAlt: ${JSON.stringify(input.title.trim())},`,
    `    readingMinutes: ${minutes(rows)},`,
    "    body: [",
    body,
    "    ],",
    "  },",
  ].join(newline(blog));
  const next = insertAfter(blog, "export const posts: BlogPost[] = [", post);
  if (!next) return { ok: false, error: "Real Time Web's journal pattern has changed. The pull request stays closed." };
  return { ok: true, files: [{ path: "lib/blog.ts", content: next }] };
}

function skalle(input: ArticleDraft, slug: string, rows: string[], date: string): { ok: true; files: CodeFile[] } | { ok: false; error: string } {
  const chronicle = /chronicle/i.test(input.section ?? "");
  const path = chronicle ? "src/content/chronicles.ts" : "src/content/articles.ts";
  const articles = input.sources[path] ?? "";
  if (!articles) {
    return {
      ok: false,
      error: chronicle
        ? "Skalle's chronicle file could not be read. The pull request stays closed."
        : "Skalle's article file could not be read. The pull request stays closed.",
    };
  }
  if (hasSlug(articles, slug)) return { ok: false, error: `Skalle already has an article slug “${slug}”. The pull request stays closed.` };
  const body = rows.map((text) => `      { type: "p", text: ${JSON.stringify(text)} },`).join(newline(articles));
  const article = [
    "  {",
    `    slug: ${JSON.stringify(slug)},`,
    `    section: "Field notes",`,
    `    title: ${JSON.stringify(input.title.trim())},`,
    `    dek: ${JSON.stringify(dek(rows))},`,
    `    byline: ${JSON.stringify(input.author?.trim() || "Brain")},`,
    `    date: ${JSON.stringify(date)},`,
    `    minutes: ${minutes(rows)},`,
    `    image: "/times/wait-robots.jpg",`,
    `    alt: ${JSON.stringify(input.title.trim())},`,
    `    caption: ${JSON.stringify(input.title.trim())},`,
    "    body: [",
    body,
    "    ],",
    "  },",
  ].join(newline(articles));
  const markers = chronicle
    ? ["export const chronicles: Chronicle[] = [", "export const chronicles = ["]
    : ["export const articles: Article[] = ["];
  let next = "";
  for (const marker of markers) {
    next = insertAfter(articles, marker, `${promptLine(input.design)}${newline(articles)}${article}`);
    if (next) break;
  }
  if (!next) {
    return {
      ok: false,
      error: chronicle
        ? "Skalle's chronicle pattern has changed. The pull request stays closed."
        : "Skalle's article pattern has changed. The pull request stays closed.",
    };
  }
  return { ok: true, files: [{ path, content: next }] };
}
