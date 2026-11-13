import { useEffect, useState } from "react";
import { applyTheme, loadPage, loadShared, SharedContext, list, type Doc, type Sec, type Shared } from "@/lib/cms";
import { usePathname } from "@/lib/router";
import { setArticles, type Article } from "@/content/articles";
import { setChronicles } from "@/content/chronicles-catalog";
import { setManual } from "@/components/spec-manual";
import { Chronicles } from "@/components/chronicles";
import { Frame } from "@/components/shell";
import { renderPage } from "@/site/render";
import { ArticlePage, NotFound } from "@/site/times";

type Route = { kind: "page" | "article" | "issue"; slug: string };

/** / is the home page, /articles/<slug> a story, /chronicles/<slug> a comic volume, anything else is a page whose slug is the address. */
function routeOf(path: string): Route {
  const p = path.replace(/\/+$/, "") || "/";
  if (p === "/") return { kind: "page", slug: "home" };
  const a = /^\/articles\/([^/]+)$/.exec(p);
  if (a) return { kind: "article", slug: a[1] };
  const c = /^\/chronicles\/([^/]+)$/.exec(p);
  if (c) return { kind: "issue", slug: c[1] };
  return { kind: "page", slug: p.slice(1) };
}

const upsert = (items: Doc[], entry: Doc) => {
  const at = items.findIndex((x) => x.slug === entry.slug);
  return at < 0 ? [...items, entry] : items.map((x, i) => (i === at ? { ...x, ...entry } : x));
};

export default function App() {
  const path = usePathname();
  const route = routeOf(path);
  const [shared, setShared] = useState<Shared | null>(null);
  const [down, setDown] = useState(false);
  const [docs, setDocs] = useState<Record<string, Doc | undefined>>({});

  // The shared parts (header, footer, settings, spec manual, articles, volumes). If the CMS is not answering yet, keep trying.
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

  // Pages that are shown, loaded when first needed. The shelf and the articles pages are needed on every Chronicles/Articles address.
  const wanted = route.kind === "page" ? route.slug : route.kind === "issue" ? "chronicles" : "articles";
  useEffect(() => {
    if (!shared || wanted in docs) return;
    let stop = false;
    loadPage(wanted).then((page) => { if (!stop) setDocs((d) => ({ ...d, [wanted]: page ?? undefined })); });
    return () => { stop = true; };
  }, [!!shared, wanted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live preview: the CMS sends the draft being edited, and the page re-renders with it as you type.
  useEffect(() => {
    const onPreview = (e: Event) => {
      const m = (e as CustomEvent).detail as { contentType?: string; entry?: Doc } | undefined;
      const entry = m?.entry;
      if (!entry) return;
      if (m.contentType === "pages") { setDocs((d) => ({ ...d, [entry.slug || "home"]: entry })); return; }
      setShared((s) => {
        if (!s) return s;
        switch (m.contentType) {
          case "header": return { ...s, header: entry };
          case "footer": return { ...s, footer: entry };
          case "website-settings": return { ...s, settings: entry };
          case "spec-manual": return { ...s, manual: entry };
          case "article": return { ...s, articles: upsert(s.articles, entry) };
          case "chronicle-issue": return { ...s, issues: upsert(s.issues, entry) };
          default: return s;
        }
      });
    };
    window.addEventListener("synx:preview", onPreview);
    return () => window.removeEventListener("synx:preview", onPreview);
  }, []);

  useEffect(() => applyTheme(shared?.settings), [shared?.settings]);

  if (!shared) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#070907", color: "#8c9188", fontFamily: "monospace", letterSpacing: ".08em" }}>
        {down ? "Waiting for the CMS server…" : "Loading…"}
      </div>
    );
  }

  // The articles, volumes and spec manual are plain data the design reads while it draws, so they are set before every draw.
  setArticles(shared.articles as unknown as Article[], list(docs.articles?.sections).find((x: Sec) => x._type === "times-masthead")?.name);
  setChronicles(shared.issues);
  setManual(shared.manual);

  const masthead = list(docs.articles?.sections).find((x: Sec) => x._type === "times-masthead");
  const shelf = list(docs.chronicles?.sections).find((x: Sec) => x._type === "chronicles-shelf");
  const page = docs[wanted];
  const title = route.kind === "page" ? page?.title : undefined;
  const site = shared.settings?.siteName || "Skalle AI";
  document.title = title && route.slug !== "home" ? `${title} | ${site}` : shared.settings?.siteName ? `${site} | Meet Skalle` : document.title;

  let body;
  if (route.kind === "article") body = <ArticlePage slug={route.slug} masthead={masthead} />;
  else if (route.kind === "issue") {
    body = (
      <Frame>
        <Chronicles key={route.slug} initialSlug={route.slug} head={{ kicker: shelf?.kicker, title: shelf?.title, lede: shelf?.lede }} />
      </Frame>
    );
  } else if (!(wanted in docs)) body = <Frame><div style={{ minHeight: "60vh" }} /></Frame>;
  else if (!page) body = <NotFound />;
  else body = <Frame>{renderPage(list(page.sections))}</Frame>;

  return <SharedContext.Provider value={shared}>{body}</SharedContext.Provider>;
}
