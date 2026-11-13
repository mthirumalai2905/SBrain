import { createContext, useContext } from "react";

/**
 * Synx Brain connection. Every page is built from content kept in the CMS: the docs, the Journals articles, the designed pages, the
 * glossary and the shared header, footer and settings. Set VITE_CMS_URL and VITE_CMS_KEY (this site's delivery key) in .env.local.
 */
export const CMS_URL = (import.meta.env.VITE_CMS_URL as string | undefined)?.replace(/\/$/, "");
const KEY = import.meta.env.VITE_CMS_KEY as string | undefined;

export type Doc = { [field: string]: any };
/** One section of a page, flattened by the CMS: its fields plus `_key` and `_type`. */
export type Sec = { _key: string; _type: string; [field: string]: any };

export type Shared = {
  header?: Doc;
  footer?: Doc;
  settings?: Doc;
  notes?: Doc;
  docs: Doc[];
  posts: Doc[];
  authors: Doc[];
  glossary: Doc[];
  /** the content type the CMS is previewing right now */
  previewing?: string;
};

async function get(path: string): Promise<any> {
  if (!CMS_URL || !KEY) return undefined;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(CMS_URL + path, { headers: { "x-api-key": KEY }, signal: ctrl.signal });
    return r.ok ? await r.json() : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/** Everything the pages share. Resolves to undefined when the CMS cannot be reached. */
export async function loadShared(): Promise<Shared | undefined> {
  const [header, footer, settings, notes, docs, posts, authors, glossary] = await Promise.all([
    get("/public/header"),
    get("/public/footer"),
    get("/public/website-settings"),
    get("/public/reader-notes"),
    get("/public/doc?limit=100"),
    get("/public/post?limit=100"),
    get("/public/author?limit=100"),
    get("/public/glossary-term?limit=100"),
  ]);
  if (!settings && !header && !docs) return undefined;
  return {
    header: header?.items?.[0], footer: footer?.items?.[0], settings: settings?.items?.[0], notes: notes?.items?.[0],
    docs: docs?.items ?? [], posts: posts?.items ?? [], authors: authors?.items ?? [], glossary: glossary?.items ?? [],
  };
}

export const loadPage = (slug: string): Promise<Doc | undefined> => get(`/public/pages/${slug}`);

export const SharedContext = createContext<Shared>({ docs: [], posts: [], authors: [], glossary: [] });
export const useShared = () => useContext(SharedContext);

/** Media uploaded in the CMS: relative paths are served by the CMS, so point them at it. */
export const mediaUrl = (u?: string) => (u && u.startsWith("/") && CMS_URL ? CMS_URL + u : u || undefined);

/** Website Settings colours and the CSS variable each one sets, for the dark and the light theme. */
const THEME: Record<string, string> = {
  Background: "--bg",
  Panel: "--bg-elev",
  Text: "--text",
  Muted: "--muted",
  Accent: "--accent",
  Warn: "--warn",
};

export function applyTheme(settings?: Doc) {
  const block = (prefix: "dark" | "light") =>
    Object.entries(THEME).flatMap(([key, cssVar]) => {
      const v = settings?.[prefix + key];
      return typeof v === "string" && v ? [`${cssVar}: ${v};`] : [];
    });
  const dark = block("dark");
  const light = block("light");
  let style = document.getElementById("cms-theme") as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "cms-theme";
    document.head.appendChild(style);
  }
  style.textContent =
    (dark.length ? `html[data-theme="dark"], html[data-theme="dark"] body, :root { ${dark.join(" ")} }\n` : "") +
    (light.length ? `html[data-theme="light"], html[data-theme="light"] body { ${light.join(" ")} }` : "");
}

/** Edit marker for click-to-edit inside the CMS preview: `{...edit("title")}` for a document, or `{...edit("body.2.text")}`. */
export const edit = (path: string, key = "page") => ({ "data-synx-edit": `${key}.${path}` });

/** Loads the click-to-edit script, inside the CMS preview frame only. It never loads on the live site. */
export function loadEditor() {
  if (!CMS_URL || window.parent === window) return;
  const s = document.createElement("script");
  s.src = CMS_URL + "/sdk/visual-editing.js";
  document.head.appendChild(s);
}

export const list = (v: unknown): any[] => (Array.isArray(v) ? v : []);
