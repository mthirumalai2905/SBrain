import { useEffect, useRef, type ReactNode } from "react";
import CtaBand from "../components/CtaBand";
import { RollText } from "../components/Morph";
import { synxTools } from "../components/SynxTools";
import {
  AgentLog,
  ConsoleFrame,
  DomainClaim,
  LinkGraph,
  ServiceCard,
  ServiceRow,
  useTicker,
  type GraphNode,
} from "../components/Console";
import Chapter from "../sections/Chapter";
import Icon from "../components/Icon";
import { asWords, edit, Sections, useSections, wordsOf, type Sec } from "../lib/cms";
import { featureList, ownership as ownershipPoints } from "../lib/content";
import { Reveal, SplitHeading } from "../lib/motion";

const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Which picture each feature shows. The CMS picks one by name; the order below is the built-in order. */
const visualNames = ["Domain claim", "Developer tools", "Morphic service", "Service address", "Link graph", "Agent log"];

/** What the page shows when the CMS has nothing for it. The CMS "Features" page mirrors these. */
const defaults: Sec[] = [
  {
    _key: "hero", _type: "page-hero", title: "Everything your service needs to", words: asWords(["get found", "stay yours", "connect", "grow"]),
    text: "A domain of your own, the Synx developer tools and a network where people, AI agents and machines can use what you build.",
    primaryLabel: "Get started", primaryUrl: "/contact#register", secondaryLabel: "Take the tour", secondaryUrl: "#features",
  },
  {
    _key: "tour", _type: "feature-tour", heading: "Everything to publish on the Real Time Web",
    items: featureList.map((f, i) => ({ title: f.title, text: f.text, visual: visualNames[i] })),
    tools: synxTools.map((t) => ({ name: t.name === "SKALLE" ? "Skalle AI" : t.name.replace("PASS", "Pass"), soon: t.name === "SKALLE" })),
  },
  { _key: "own", _type: "ownership", heading: "You build it, you own it", items: ownershipPoints },
  {
    _key: "trade", _type: "chapter", tag: "Planned with Synx Trade", heading: "Get paid along the chain", visual: "Value chain",
    paragraphs: [{ text: "Our planned marketplace lets you set commercial terms on your data and services. When a chain that includes your part is used, everyone who contributed could share in what it earns." }],
  },
  { _key: "cta", _type: "cta-band", heading: "Your first service is closer than you think" },
];

/** The whole Morph Space console as a product shot: tilted back, it straightens up as you scroll. */
function Hero({ s }: { s: Sec }) {
  const shot = useRef<HTMLDivElement>(null);
  const calls = useTicker(48210, 700, 9);
  useEffect(() => {
    if (reduce()) return;
    const el = shot.current!;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, 1 - (r.top - window.innerHeight * 0.15) / (window.innerHeight * 0.7)));
      el.style.setProperty("--tilt", (1 - p).toFixed(3));
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
    <section className="fhero" id="top">
      <div className="wrap fhero-copy">
        <h1 className="scene-title scene-title--hero fade-up" {...edit(s, "title")}>
          {s.title}
          <br />
          <RollText words={wordsOf(s.words, ["get found"])} />
        </h1>
        <p className="scene-sub fade-up" style={{ animationDelay: "0.3s" }} {...edit(s, "text")}>
          {s.text}
        </p>
        <div className="scene-actions fade-up" style={{ animationDelay: "0.45s" }}>
          <a href={s.primaryUrl || "/contact#register"} className="gbtn gbtn-light" {...edit(s, "primaryLabel")}>{s.primaryLabel || "Get started"}</a>
          <a href={s.secondaryUrl || "#features"} className="gbtn" {...edit(s, "secondaryLabel")}>{s.secondaryLabel || "Take the tour"}</a>
        </div>
      </div>
      <div className="wrap">
        <div className="fhero-shot fade-up" ref={shot} style={{ animationDelay: "0.6s" }}>
          <ConsoleFrame address="greenacre.space">
            <div className="dash">
              <nav className="dash-nav">
                <span className="on">Services</span>
                <span>Resources</span>
                <span>Agents</span>
                <span>Domain</span>
                <span>
                  Trade <small>Soon</small>
                </span>
              </nav>
              <div className="dash-main">
                <div className="dash-title">
                  <b>Services</b>
                  <small>4 published</small>
                </div>
                <ServiceRow name="soil-sensor-12" kind="Live readings" tone="live" label="Streaming" seed={2} />
                <ServiceRow name="rainfall-model" kind="Linked from a lab" tone="linked" label="Linked" seed={4} />
                <ServiceRow name="irrigation-plan" kind="Service" tone="live" label="3 agents" seed={6} />
                <ServiceRow name="price-feed" kind="Dataset" tone="idle" label="Idle" seed={8} />
              </div>
              <aside className="dash-side">
                <div className="dash-stat">
                  <small>Agent requests this week</small>
                  <b>{calls.toLocaleString("en")}</b>
                </div>
                <AgentLog rows={5} />
              </aside>
            </div>
          </ConsoleFrame>
        </div>
      </div>
    </section>
  );
}

const NODES: GraphNode[] = [
  { id: "a", label: "your service", x: 50, y: 30, main: true },
  { id: "b", label: "weather source", x: 14, y: 12 },
  { id: "c", label: "AI model", x: 86, y: 14 },
  { id: "d", label: "energy service", x: 18, y: 52 },
  { id: "e", label: "agent", x: 82, y: 50 },
];
const LINKS: [string, string][] = [["b", "a"], ["a", "c"], ["a", "d"], ["c", "e"]];

/** The real piece of UI that shows each feature, in the order of visualNames. */
const featureVisuals: ReactNode[] = [
  <ConsoleFrame address="claim" key="domain">
    <DomainClaim />
  </ConsoleFrame>,
  null, // the tool tiles are drawn by <Dock>, which reads them from the CMS
  <div className="fmorph" key="service" aria-hidden>
    <span className="fmorph-chip">
      <b>Soil sensor</b>
      <small>A device you own</small>
    </span>
    <span className="fmorph-arrow">→</span>
    <ServiceCard compact />
  </div>,
  <div className="faddr" key="address" aria-hidden>
    <div className="faddr-bar">
      <span>rtw://greenacre.space/soil</span>
      <i>Copy</i>
    </div>
    <div className="faddr-chips">
      <span>People</span>
      <span>Apps</span>
      <span>AI agents</span>
      <span>Machines</span>
    </div>
  </div>,
  <ConsoleFrame address="greenacre.space/network" key="connect">
    <LinkGraph nodes={NODES} links={LINKS} />
  </ConsoleFrame>,
  <ConsoleFrame address="greenacre.space/requests" key="agents">
    <AgentLog rows={6} />
  </ConsoleFrame>,
];

/** The Synx tool tiles. Names and icons come from the CMS; with none set, the built-in tools and marks show. */
function Dock({ s }: { s: Sec }) {
  const tools: { name?: string; icon?: string; soon?: boolean }[] = s.tools?.length
    ? s.tools
    : synxTools.map((t) => ({ name: t.name === "SKALLE" ? "Skalle AI" : t.name.replace("PASS", "Pass"), soon: t.name === "SKALLE" }));
  return (
    <div className="fdock">
      {tools.map((t, i) => (
        <span key={i} className="fdock-tile">
          <span className="fdock-mark">
            <Icon value={t.icon} size={30} attrs={edit(s, `tools.${i}.icon`)} fallback={<span {...edit(s, `tools.${i}.icon`)}>{synxTools[i]?.mark}</span>} />
          </span>
          <b {...edit(s, `tools.${i}.name`)}>{t.name}</b>
          {t.soon && <small>Soon</small>}
        </span>
      ))}
    </div>
  );
}

/** Features as a zig-zag tour: copy on one side, the working UI on the other. */
function Tour({ s }: { s: Sec }) {
  const items: { title?: string; text?: string; visual?: string }[] = s.items ?? [];
  return (
    <section className="wrap lsection" id="features">
      <div className="lhead">
        <SplitHeading text={s.heading ?? ""} className="lh2" dimFrom={3} edit={`${s._key}.heading`} />
      </div>
      <div className="tour">
        {items.map((f, i) => (
          <article key={i} className={`tour-row ${i % 2 ? "tour-row--flip" : ""}`}>
            <div className="tour-copy">
              <SplitHeading text={f.title ?? ""} className="tour-title" edit={`${s._key}.items.${i}.title`} />
              <Reveal>
                <p {...edit(s, `items.${i}.text`)}>{f.text}</p>
              </Reveal>
            </div>
            <Reveal className="tour-visual" delay={0.1}>
              {f.visual === visualNames[1] ? <Dock s={s} /> : featureVisuals[Math.max(0, visualNames.indexOf(f.visual ?? ""))]}
            </Reveal>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Ownership as one big statement on a light sheet. */
function Ownership({ s }: { s: Sec }) {
  const items: { stat?: string; title?: string; text?: string }[] = s.items ?? [];
  return (
    <section className="paper" id="ownership">
      <div className="wrap lsection own">
        <SplitHeading text={s.heading ?? ""} className="lh2" dimFrom={3} edit={`${s._key}.heading`} />
        <div className="own-grid">
          {items.map((o, i) => (
            <Reveal key={i} delay={i * 0.08} className="own-item">
              <span className="own-stat" {...edit(s, `items.${i}.stat`)}>{o.stat}</span>
              <b {...edit(s, `items.${i}.title`)}>{o.title}</b>
              <p {...edit(s, `items.${i}.text`)}>{o.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function FeaturesPage() {
  const list = useSections(defaults);
  return (
    <main className="inner live">
      <Sections
        list={list}
        registry={{
          "page-hero": (s) => <Hero s={s} />,
          "feature-tour": (s) => <Tour s={s} />,
          ownership: (s) => <Ownership s={s} />,
          chapter: (s, nth) => <Chapter s={s} flip={nth % 2 === 1} />,
          "cta-band": (s) => <CtaBand s={s} />,
        }}
      />
    </main>
  );
}
