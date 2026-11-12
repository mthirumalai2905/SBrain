import { createContext, useContext } from "react";

/**
 * Synx Brain connection. Every page is built from content kept in the CMS: the page's sections, the shared header,
 * footer and settings, the articles and the team. Set VITE_CMS_URL and VITE_CMS_KEY (this site's delivery key) in
 * .env.local. See .env.example.
 */
export const CMS_URL = (import.meta.env.VITE_CMS_URL as string | undefined)?.replace(/\/$/, "");
const KEY = import.meta.env.VITE_CMS_KEY as string | undefined;

export type Doc = { [field: string]: any };
/** One section of a page, flattened by the CMS: its fields plus `_key` and `_type`. */
export type Sec = { _key: string; _type: string; [field: string]: any };

export type Shared = { header?: Doc; footer?: Doc; settings?: Doc; articles: Doc[]; team: Doc[]; film?: string; /** the content type the CMS is previewing right now (so header and footer are only editable when they are the open document) */ previewing?: string };

async function get(path: string): Promise<any> {
  if (!CMS_URL || !KEY) return undefined;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(CMS_URL + path, { headers: { "x-api-key": KEY }, signal: ctrl.signal });
    return r.ok ? await r.json() : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/** The parts every page shares. Resolves to undefined when the CMS cannot be reached. */
export async function loadShared(): Promise<Shared | undefined> {
  const [header, footer, settings, articles, team, home] = await Promise.all([
    get("/public/header"),
    get("/public/footer"),
    get("/public/website-settings"),
    get("/public/article?limit=100"),
    get("/public/team-member?limit=100"),
    get("/public/pages/home"),
  ]);
  if (!settings && !header && !home) return undefined;
  const film = (home?.sections as Sec[] | undefined)?.find((s) => s._type === "home-hero")?.backgroundVideo;
  return { header: header?.items?.[0], footer: footer?.items?.[0], settings: settings?.items?.[0], articles: articles?.items ?? [], team: team?.items ?? [], film };
}

export const loadPage = (slug: string): Promise<Doc | undefined> => get(`/public/pages/${slug}`);

export const SharedContext = createContext<Shared>({ articles: [], team: [] });
export const useShared = () => useContext(SharedContext);

/** Media uploaded in the CMS: relative paths are served by the CMS, so point them at it. */
export const mediaUrl = (u?: string) => (u && u.startsWith("/") && CMS_URL ? CMS_URL + u : u || undefined);

/** Website Settings fields and the CSS variables each one sets in the design. */
const THEME: Record<string, string> = {
  backgroundColor: "--bg",
  cardColor: "--card",
  textColor: "--text",
  mutedColor: "--muted",
  accentColor: "--orange",
  accentSoftColor: "--orange-2",
};

export function applyTheme(settings?: Doc) {
  const rules = Object.entries(THEME).flatMap(([field, name]) => (typeof settings?.[field] === "string" && settings[field] ? [`${name}: ${settings[field]};`] : []));
  let style = document.getElementById("cms-theme") as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "cms-theme";
    document.head.appendChild(style);
  }
  style.textContent = rules.length ? `:root { ${rules.join(" ")} }` : "";
  const icon = mediaUrl(settings?.favicon);
  if (icon) document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute("href", icon);
}

/** Edit marker for click-to-edit inside the CMS preview: `{...edit(s, "heading")}`. Harmless on the live site. */
export const edit = (s: { _key: string }, field: string) => ({ "data-synx-edit": `${s._key}.${field}` });
export const editImage = (s: { _key: string }, field: string) => ({ "data-synx-image": `${s._key}.${field}` });
/**
 * Edit markers for a shared document (header, footer). Click-to-edit paths are relative to the document open in the CMS, so these
 * only appear while that document is the one being previewed; otherwise a click would point at the wrong page.
 */
export function useEditDoc(type: string) {
  const on = useContext(SharedContext).previewing === type;
  return {
    text: (field: string) => (on ? { "data-synx-edit": `page.${field}` } : {}),
    image: (field: string) => (on ? { "data-synx-image": `page.${field}` } : {}),
  };
}

/** Singletons (header, footer, settings) are edited by their field name alone. */
export const editDoc = (field: string) => ({ "data-synx-edit": `page.${field}` });

/** Loads the click-to-edit script, inside the CMS preview frame only. It never loads on the live site. */
export function loadEditor() {
  if (!CMS_URL || window.parent === window) return;
  const s = document.createElement("script");
  s.src = CMS_URL + "/sdk/visual-editing.js";
  document.head.appendChild(s);
}
