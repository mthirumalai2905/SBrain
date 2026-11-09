import { useEffect, useMemo, useRef } from "react";
import HeroVideo from "../components/HeroVideo";
import { SplitHeading, useTypeCycle } from "../lib/motion";
import { edit, mediaUrl, Sections, useSections, type Sec } from "../lib/cms";
import Icon from "../components/Icon";

// Example addresses typed out in the hero's address bar.
const DOMAINS = ["yourname.com", "studio.io", "acme.dev", "teamspace.app"];

const SUB = "Morph Space is a platform for tools. Pick a domain, set up the tools you need, and share them with the people you work with.";

/** What the page shows when the CMS has nothing for it. */
const defaults: Sec[] = [
  {
    _key: "hero", _type: "home-hero", title: "Set up your domain Share your tools", subtitle: SUB,
    domains: DOMAINS.map((domain) => ({ domain })),
    primaryLabel: "Register now", primaryUrl: "/contact#register", secondaryLabel: "See pricing", secondaryUrl: "/pricing",
  },
];

function Hero({ s }: { s: Sec }) {
  const list: string[] = (s.domains ?? []).map((d: { domain?: string }) => d.domain).filter(Boolean);
  const domains = useMemo(() => (list.length ? list : DOMAINS), [list.join("|")]);
  const typed = useTypeCycle(domains);
  const section = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const city = useRef<HTMLDivElement>(null);

  // Content lifts and fades, the city drifts down, as the hero scrolls away.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const h = section.current!.offsetHeight;
      const p = Math.min(1, Math.max(0, window.scrollY / h));
      content.current!.style.transform = `translateY(${-120 * p}px)`;
      content.current!.style.opacity = String(Math.max(0, 1 - p / 0.7));
      city.current!.style.transform = `translateY(${60 * p}px)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="hero" id="top" ref={section}>
      <div className="hero-glow" aria-hidden />
      <div className="wrap hero-content" ref={content}>
        <div className="hero-domain fade-up" style={{ animationDelay: "0.05s" }} aria-label="Example: your own domain">
          <Icon
            value={s.domainIcon}
            size={14}
            attrs={edit(s, "domainIcon")}
            fallback={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden {...edit(s, "domainIcon")}>
                <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
                <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
              </svg>
            }
          />
          <span className="proto">https://</span>
          <b>{typed}</b>
          <i className="caret" aria-hidden />
        </div>
        <SplitHeading as="h1" className="hero-title" text={s.title ?? ""} dimFrom={4} delay={0.1} edit={`${s._key}.title`} />
        <p className="hero-sub fade-up" style={{ animationDelay: "0.55s" }} {...edit(s, "subtitle")}>
          {s.subtitle}
        </p>
        <div className="hero-cta fade-up" style={{ animationDelay: "0.7s" }}>
          <a href={s.primaryUrl || "/contact#register"} className="gbtn gbtn-light" {...edit(s, "primaryLabel")}>{s.primaryLabel || "Register now"}</a>
          <a href={s.secondaryUrl || "/pricing"} className="gbtn" {...edit(s, "secondaryLabel")}>{s.secondaryLabel || "See pricing"}</a>
        </div>
      </div>
      <div className="city-wrap" ref={city} aria-hidden>
        <HeroVideo video={mediaUrl(s.backgroundVideo)} image={mediaUrl(s.backgroundImage)} />
      </div>
    </section>
  );
}

export default function Home() {
  const list = useSections(defaults);
  return (
    <main>
      <Sections list={list} registry={{ "home-hero": (s) => <Hero s={s} /> }} />
    </main>
  );
}
