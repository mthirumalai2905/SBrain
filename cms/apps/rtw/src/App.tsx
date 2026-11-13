import { useEffect, useState, type ReactNode } from "react";
import { NavPaletteProvider } from "@/components/NavPalette";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SmoothScroll } from "@/components/SmoothScroll";
import { ThemeProvider } from "@/components/ThemeProvider";
import { setGlossary } from "@/components/Glossary";
import { applyTheme, list, loadPage, loadShared, SharedContext, type Doc, type Sec, type Shared } from "@/lib/cms";
import { setPosts } from "@/lib/blog";
import { setTopics } from "@/lib/contact";
import { setDocs } from "@/lib/docs";
import { setNotes } from "@/lib/notes";
import { navigate, usePathname } from "@/lib/router";
import { DocPage } from "@/site/Docs";
import { BlogPage, PostPage } from "@/site/Journal";
import { renderSections } from "@/site/Pages";

/** The old addresses of the Next.js site still lead somewhere. */
const REDIRECTS: [RegExp, string][] = [
  [/^\/docs\/architecture\/synxpass$/, "/docs/architecture/authentication"],
  [/^\/hood$/, "/hood/implementation/blueprint"],
  [/^\/docs\/implementation(\/.*)?$/, "/hood/implementation$1"],
  [/^\/docs\/introduction\/two-webs$/, "/blog/two-webs"],
  [/^\/docs\/brand(\/.*)?$/, "/docs/introduction/tomorrow$1"],
  [/^\/docs\/reference\/glossary$/, "/docs/implementation/dictionary"],
];

type Route = { kind: "page" | "docs" | "post"; slug: string; parts: string[] };

/** / is the home page, /docs/... a documentation page, /blog the Journals, /blog/<slug> an article, /contact and /hood their pages. */
function routeOf(path: string): Route {
  const p = path.replace(/\/+$/, "") || "/";
  const parts = p.split("/").filter(Boolean);
  if (!parts.length) return { kind: "page", slug: "home", parts };
  if (parts[0] === "docs") return { kind: "docs", slug: "docs", parts: parts.slice(1) };
  if (parts[0] === "blog" && parts[1]) return { kind: "post", slug: parts[1], parts };
  if (parts[0] === "hood") return { kind: "page", slug: "hood", parts };
  return { kind: "page", slug: parts[0], parts };
}

const upsert = (items: Doc[], entry: Doc) => {
  const at = items.findIndex((x) => x.slug === entry.slug);
  return at < 0 ? [...items, entry] : items.map((x, i) => (i === at ? { ...x, ...entry } : x));
};

export default function App() {
  const path = usePathname();
  const [shared, setShared] = useState<Shared | null>(null);
  const [down, setDown] = useState(false);
  const [pages, setPages] = useState<Record<string, Doc | undefined>>({});

  const redirect = REDIRECTS.map(([re, to]) => (re.test(path) ? path.replace(re, to) : null)).find(Boolean);
  useEffect(() => { if (redirect) navigate(redirect); }, [redirect]);

  // Everything the pages share. If the CMS is not answering yet, keep trying.
  useEffect(() => {
    let stop = false;
    const go = async () => {
      const s = await loadShared();
      if (stop) return;
      if (s) { setShared(s); setDown(false); } else { setDown(true); setTimeout(go, 2500); }
    };
    go();
    return () => { stop = true; };
  }, []);

  const route = routeOf(path);
  const wanted = route.kind === "page" ? route.slug : route.kind === "docs" ? "" : "blog";
  useEffect(() => {
    if (!shared || !wanted || wanted in pages) return;
    let stop = false;
    loadPage(wanted).then((page) => { if (!stop) setPages((d) => ({ ...d, [wanted]: page ?? undefined })); });
    return () => { stop = true; };
  }, [!!shared, wanted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live preview: the CMS sends the draft being edited, and the page re-renders with it as you type.
  useEffect(() => {
    const onPreview = (e: Event) => {
      const m = (e as CustomEvent).detail as { contentType?: string; entry?: Doc } | undefined;
      const entry = m?.entry;
      if (!entry) return;
      // The CMS always loads the site root; for a document or an article the site goes to that page itself.
      if (m.contentType === "doc") navigate(entry.path ? `/docs/${entry.path}` : "/docs");
      if (m.contentType === "post" && entry.slug) navigate(`/blog/${entry.slug}`);
      if (m.contentType === "pages") { setPages((d) => ({ ...d, [entry.slug || "home"]: entry })); return; }
      setShared((s) => {
        if (!s) return s;
        switch (m.contentType) {
          case "header": return { ...s, header: entry };
          case "footer": return { ...s, footer: entry };
          case "website-settings": return { ...s, settings: entry };
          case "reader-notes": return { ...s, notes: entry };
          case "doc": return { ...s, docs: upsert(s.docs, entry) };
          // a draft or held-out article is still shown while it is being edited
          case "post": return { ...s, posts: upsert(s.posts, { ...entry, archived: false }) };
          case "author": return { ...s, authors: upsert(s.authors, entry) };
          case "glossary-term": return { ...s, glossary: upsert(s.glossary, entry) };
          default: return s;
        }
      });
    };
    window.addEventListener("synx:preview", onPreview);
    return () => window.removeEventListener("synx:preview", onPreview);
  }, []);

  useEffect(() => applyTheme(shared?.settings), [shared?.settings]);

  if (redirect) return null;
  if (!shared) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#090a0c", color: "#9a948a", fontFamily: "monospace", letterSpacing: ".08em" }}>
        {down ? "Waiting for the CMS server…" : "Loading…"}
      </div>
    );
  }

  // The docs, articles, glossary and notes are plain data the design reads while it draws, so they are set before every draw.
  setNotes(shared.notes);
  setGlossary(shared.glossary);
  setDocs(shared.docs);
  setPosts(shared.posts);
  const contact = pages.contact;
  setTopics(list(list(contact?.sections).find((x: Sec) => x._type === "contact-form")?.topics).map((t) => t.text));

  let body: ReactNode;
  if (route.kind === "docs") body = <DocPage slug={route.parts} />;
  else if (route.kind === "post") body = <PostPage slug={route.slug} />;
  else if (!(wanted in pages)) body = <div style={{ minHeight: "60vh" }} />;
  else if (route.slug === "blog") {
    const intro = list(pages.blog?.sections).find((x: Sec) => x._type === "page-intro");
    body = <BlogPage intro={intro} />;
  } else if (!pages[wanted]) body = <DocNotFound />;
  else body = renderSections(list(pages[wanted]?.sections), route.slug === "home" ? "home" : route.slug === "contact" ? "contact" : "hood");

  const site = shared.settings?.siteName || "Real Time Web";
  const title = route.kind === "docs" ? undefined : pages[wanted]?.title;
  document.title = title && route.slug !== "home" ? (shared.settings?.titleTemplate || "%s · Real Time Web").replace("%s", title) : site;

  return (
    <SharedContext.Provider value={shared}>
      <SmoothScroll>
        <ThemeProvider>
          <NavPaletteProvider>
            <SiteHeader />
            <div id="main">{body}</div>
            <SiteFooter />
          </NavPaletteProvider>
        </ThemeProvider>
      </SmoothScroll>
    </SharedContext.Provider>
  );
}

function DocNotFound() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-24 text-center">
      <p className="font-mono text-[11px] tracking-[0.22em] text-[var(--accent)]">NOT PUBLISHED</p>
      <h1 className="font-serif mt-4 text-4xl text-[var(--ink)]">This page is not published</h1>
    </main>
  );
}
