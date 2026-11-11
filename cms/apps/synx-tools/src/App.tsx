import { useEffect, useState, type ReactNode } from "react";
import { applyTheme, loadPage, loadShared, mediaUrl, SharedContext, type Doc, type Shared } from "@/lib/cms";
import { usePathname } from "@/lib/router";
import { renderArticle, renderNotFound, renderPage } from "@/site/render";
import { Dynamics } from "@/components/Dynamics";
import { FlowMusic } from "@/components/FlowMusic";
import { JsonLd } from "@/components/JsonLd";
import { MatrixRain } from "@/components/MatrixRain";
import { SmoothScroll } from "@/components/SmoothScroll";
import { TextMotion } from "@/components/TextMotion";

const list = (v: unknown): any[] => (Array.isArray(v) ? v : []);

/** / is the home page, /news/<slug> an article, anything else is a page whose slug is the address. */
function routeOf(path: string): { kind: "page" | "article"; slug: string } {
  const p = path.replace(/\/+$/, "") || "/";
  if (p === "/") return { kind: "page", slug: "home" };
  const m = /^\/news\/([^/]+)$/.exec(p);
  return m ? { kind: "article", slug: m[1] } : { kind: "page", slug: p.slice(1) };
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
  const [doc, setDoc] = useState<{ slug: string; page?: Doc } | null>(null);

  // The shared parts (header, footer, settings, articles, team). If the CMS is not answering yet, keep trying.
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

  useEffect(() => {
    if (!shared || route.kind !== "page") return;
    let stop = false;
    loadPage(route.slug).then((page) => { if (!stop) setDoc({ slug: route.slug, page }); });
    return () => { stop = true; };
  }, [!!shared, route.kind, route.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live preview: the CMS sends the draft being edited, and the page re-renders with it as you type.
  useEffect(() => {
    const onPreview = (e: Event) => {
      const m = (e as CustomEvent).detail as { contentType?: string; entry?: Doc } | undefined;
      const entry = m?.entry;
      if (!entry) return;
      if (m.contentType === "pages") { if ((entry.slug || "home") === route.slug) setDoc({ slug: route.slug, page: entry }); return; }
      setShared((s) => {
        if (!s) return s;
        switch (m.contentType) {
          case "header": return { ...s, header: entry };
          case "footer": return { ...s, footer: entry };
          case "website-settings": return { ...s, settings: entry };
          case "article": return { ...s, articles: upsert(s.articles, entry) };
          case "team-member": return { ...s, team: upsert(s.team, entry) };
          default: return s;
        }
      });
    };
    window.addEventListener("synx:preview", onPreview);
    return () => window.removeEventListener("synx:preview", onPreview);
  }, [route.slug]);

  useEffect(() => applyTheme(shared?.settings), [shared?.settings]);

  const article = route.kind === "article" ? shared?.articles.find((a) => a.slug === route.slug && list(a.blocks).length) : undefined;
  const page = route.kind === "page" ? doc : null;
  useEffect(() => {
    const name = shared?.settings?.siteName || "Synx tools";
    const title = article?.title ?? page?.page?.title;
    document.title = !title || route.slug === "home" ? name : `${title} - ${name}`;
    const description = article?.summary ?? page?.page?.description;
    if (description) document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  }, [article, page, route.slug, shared?.settings?.siteName]);

  if (!shared) {
    return down ? (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#a89c90", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 24 }}>
        <p>Waiting for the CMS to answer. Start it with <code>npm run dev</code> in the cms folder.</p>
      </div>
    ) : null;
  }

  let content: ReactNode = null;
  if (route.kind === "article") content = article ? renderArticle(article) : renderNotFound();
  else if (doc) content = doc.page ? renderPage(doc.slug, doc.page, shared) : renderNotFound();

  const s = shared.settings ?? {};
  const origin = s.siteUrl || window.location.origin;
  return (
    <SharedContext.Provider value={shared}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Synx",
          url: origin,
          logo: mediaUrl(s.shareImage) ?? `${origin}/img/symbol.png`,
          description: s.description,
          founder: list(s.founders).map((f) => ({ "@type": "Person", name: f.name, ...(f.jobTitle ? { jobTitle: f.jobTitle } : {}) })),
        }}
      />
      <SmoothScroll />
      <Dynamics />
      <MatrixRain />
      <TextMotion>{content}</TextMotion>
      <FlowMusic />
    </SharedContext.Provider>
  );
}
