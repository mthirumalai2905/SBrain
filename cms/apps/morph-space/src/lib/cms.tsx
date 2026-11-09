import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Synx Brain connection. Pages are built from sections kept in the CMS; if the CMS is not set up or cannot be
 * reached, every page falls back to the text that ships with the site (see the `defaults` next to each page).
 *
 * Set VITE_CMS_URL and VITE_CMS_KEY (the site's delivery key) in .env.local. See .env.example.
 */
const URL_ = (import.meta.env.VITE_CMS_URL as string | undefined)?.replace(/\/$/, "");
const KEY = import.meta.env.VITE_CMS_KEY as string | undefined;

/** One section of a page, flattened by the CMS: its fields plus `_key` and `_type`. */
export type Sec = { _key: string; _type: string; [field: string]: any };
export type Doc = { title?: string; description?: string; sections?: Sec[]; [field: string]: any };
export type Cms = { page?: Doc; header?: Doc; footer?: Doc; settings?: Doc };

async function get(path: string): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const r = await fetch(URL_ + path, { headers: { "x-api-key": KEY! }, signal: ctrl.signal });
    return r.ok ? await r.json() : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/** Loads a page and the shared header, footer and settings. Resolves with whatever it could get. */
export async function loadCms(slug: string): Promise<Cms> {
  if (!URL_ || !KEY) return {};
  const [page, header, footer, settings] = await Promise.all([
    get(`/public/pages/${slug}`),
    get("/public/header"),
    get("/public/footer"),
    get("/public/website-settings"),
  ]);
  return { page, header: header?.items?.[0], footer: footer?.items?.[0], settings: settings?.items?.[0] };
}

const Ctx = createContext<Cms>({});
export const useCms = () => useContext(Ctx);

/** Which part of the context an edited document replaces, by its content type. */
const part: Record<string, keyof Cms> = { pages: "page", header: "header", footer: "footer", "website-settings": "settings" };

export function CmsProvider({ initial, children }: { initial: Cms; children: ReactNode }) {
  const [cms, setCms] = useState(initial);

  useEffect(() => applyTheme(cms.settings), [cms.settings]);

  // Live preview: the CMS sends the draft being edited, and the page re-renders with it as you type.
  useEffect(() => {
    const onPreview = (e: Event) => {
      const m = (e as CustomEvent).detail as { contentType?: string; entry?: Doc } | undefined;
      const key = m?.contentType ? part[m.contentType] : undefined;
      if (key && m?.entry) setCms((c) => ({ ...c, [key]: m.entry }));
    };
    window.addEventListener("synx:preview", onPreview);
    return () => window.removeEventListener("synx:preview", onPreview);
  }, []);

  return <Ctx.Provider value={cms}>{children}</Ctx.Provider>;
}

/** The sections to show: the CMS ones if the page has any, otherwise the page's built-in defaults. */
export function useSections(defaults: Sec[]): Sec[] {
  const { page } = useCms();
  return page?.sections?.length ? page.sections : defaults;
}

/**
 * Renders sections in the order the CMS gives them. `registry` maps a section type to the component that draws
 * it; it also gets how many sections of that type came before (to alternate layouts). Unknown types are skipped.
 */
export function Sections({
  list,
  registry,
}: {
  list: Sec[];
  registry: Record<string, (s: Sec, nth: number) => ReactNode>;
}) {
  const seen: Record<string, number> = {};
  return (
    <>
      {list.map((s) => {
        const nth = (seen[s._type] = (seen[s._type] ?? -1) + 1);
        const draw = registry[s._type];
        return draw ? (
          <div key={s._key} data-synx-key={s._key} style={{ display: "contents" }}>
            {draw(s, nth)}
          </div>
        ) : null;
      })}
    </>
  );
}

/** Media uploaded in the CMS: relative paths are served by the CMS, so point them at it. */
export const mediaUrl = (u?: string) => (u && u.startsWith("/") && URL_ ? URL_ + u : u || undefined);

/** Settings fields (colours) and the CSS variables each one sets. */
const THEME: Record<string, string[]> = {
  brandColor: ["--violet-400"],
  brandDark: ["--violet-700"],
  brandLight: ["--violet-200"],
  backgroundColor: ["--bg"],
  surfaceColor: ["--surface"],
  textColor: ["--text"],
  mutedColor: ["--muted"],
  accentColor: ["--accent"],
  paperColor: ["--paper"],
  paperInk: ["--paper-ink"],
};

/** Applies the site's colours, favicon, browser colour and share image from Website Settings. Unset fields keep the built-in design. */
export function applyTheme(settings?: Doc) {
  const rules = Object.entries(THEME).flatMap(([field, vars]) => {
    const v = settings?.[field];
    return typeof v === "string" && v ? vars.map((name) => `${name}: ${v};`) : [];
  });
  let style = document.getElementById("cms-theme") as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "cms-theme";
    document.head.appendChild(style);
  }
  // later in the page than the design's own variables, so these win (the inner pages define some on .inner)
  style.textContent = rules.length ? `:root, .inner { ${rules.join(" ")} }` : "";

  const meta = (name: string, attr: "name" | "property", content?: string) => {
    if (!content) return;
    let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };
  meta("theme-color", "name", settings?.themeColor);
  meta("og:image", "property", mediaUrl(settings?.shareImage));
  const icon = mediaUrl(settings?.favicon);
  if (icon) document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute("href", icon);
}

/** Edit marker for click-to-edit inside the CMS preview: `{...edit(s, "title")}`. Harmless on the live site. */
export const edit = (s: Sec, field: string) => ({ "data-synx-edit": `${s._key}.${field}` });

/** A CMS list of `{ word }` items as plain strings. */
export const wordsOf = (list: unknown, fallback: string[]): string[] => {
  const w = Array.isArray(list) ? list.map((x: { word?: string }) => x?.word).filter((x): x is string => !!x) : [];
  return w.length ? w : fallback;
};

export const asWords = (list: string[]) => list.map((word) => ({ word }));
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
