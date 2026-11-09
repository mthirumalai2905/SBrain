import { useState, type ReactNode } from "react";
import CtaBand from "../components/CtaBand";
import Faq from "../components/Faq";
import { Scene } from "../components/Scene";
import { RollText } from "../components/Morph";
import {
  AgentLog,
  ConsoleFrame,
  DomainClaim,
  LinkGraph,
  ResourceList,
  ServiceCard,
  ServiceRow,
  useTicker,
  type GraphNode,
} from "../components/Console";
import Chapter from "../sections/Chapter";
import { asWords, edit, mediaUrl, Sections, useSections, wordsOf, type Sec } from "../lib/cms";
import { creatorPath, missionIntro, morphFaqs, storyChapters } from "../lib/content";
import { Reveal, SplitHeading } from "../lib/motion";

/** What the page shows when the CMS has nothing for it. The CMS "How it works" page mirrors these. */
const defaults: Sec[] = [
  {
    _key: "hero", _type: "page-hero", title: "Start with", words: asWords(["a sensor", "a dataset", "a model", "an idea"]),
    text: missionIntro[1], primaryLabel: "Get started", primaryUrl: "/contact#register", secondaryLabel: "See it work", secondaryUrl: "#path",
  },
  { _key: "path", _type: "walkthrough", heading: "Four steps from idea to live service", steps: creatorPath },
  { _key: "statement", _type: "statement", heading: storyChapters[0].title, text: storyChapters[0].body[0] },
  ...storyChapters.slice(1).map((c, i): Sec => ({
    _key: `chapter${i}`, _type: "chapter", heading: c.title, tag: c.id === "earning" ? "Planned with Synx Trade" : "",
    paragraphs: c.body.map((text) => ({ text })),
    visual: ({ combinations: "Composer", ownership: "Data flow", earning: "Value chain" } as Record<string, string>)[c.id],
  })),
  { _key: "faq", _type: "faq", heading: "Good to know", items: morphFaqs },
  { _key: "cta", _type: "cta-band", heading: "Ready to give your idea a shape?" },
];

/** Full-screen city scene, with a small live console floating in the corner. */
function Hero({ s }: { s: Sec }) {
  return (
    <Scene video bgVideo={mediaUrl(s.backgroundVideo)} bgImage={mediaUrl(s.backgroundImage)} id="top" className="scene--hero">
      <h1 className="scene-title scene-title--hero fade-up" {...edit(s, "title")}>
        {s.title}
        <br />
        <RollText words={wordsOf(s.words, ["a sensor"])} />
      </h1>
      <p className="scene-sub fade-up" style={{ animationDelay: "0.3s" }} {...edit(s, "text")}>
        {s.text}
      </p>
      <div className="scene-actions fade-up" style={{ animationDelay: "0.45s" }}>
        <a href={s.primaryUrl || "/contact#register"} className="gbtn gbtn-light" {...edit(s, "primaryLabel")}>{s.primaryLabel || "Get started"}</a>
        <a href={s.secondaryUrl || "#path"} className="gbtn" {...edit(s, "secondaryLabel")}>{s.secondaryLabel || "See it work"}</a>
      </div>
      <div className="scene-float fade-up" style={{ animationDelay: "0.7s" }}>
        <ConsoleFrame address="greenacre.space">
          <ServiceRow name="soil-sensor-12" kind="Live readings" tone="live" label="Streaming" seed={2} />
          <ServiceRow name="irrigation-plan" kind="Service" tone="linked" label="3 agents" seed={5} />
        </ConsoleFrame>
      </div>
    </Scene>
  );
}

const NODES: GraphNode[] = [
  { id: "soil", label: "soil-sensor-12", x: 50, y: 30, main: true },
  { id: "rain", label: "rainfall-model", x: 16, y: 14 },
  { id: "plan", label: "irrigation-plan", x: 84, y: 16 },
  { id: "ops", label: "facility-ops", x: 22, y: 50 },
  { id: "market", label: "price-feed", x: 80, y: 50 },
];
const LINKS: [string, string][] = [["rain", "soil"], ["soil", "plan"], ["soil", "ops"], ["market", "plan"]];

function Travel() {
  const calls = useTicker(1284, 900, 6);
  return (
    <div className="ctravel">
      <LinkGraph nodes={NODES} links={LINKS} />
      <div className="ctravel-stat">
        <span>Agent requests today</span>
        <b>{calls.toLocaleString("en")}</b>
      </div>
    </div>
  );
}

/** What the console shows for each step. */
const stepScreens: { address: string; body: ReactNode }[] = [
  {
    address: "claim",
    body: (
      <div className="cstep">
        <DomainClaim />
        <div className="cplans">
          <span className="on">Shared · Free</span>
          <span>Creator Space</span>
          <span>Entrepreneur Space</span>
        </div>
      </div>
    ),
  },
  { address: "greenacre.space/resources", body: <ResourceList /> },
  { address: "greenacre.space/soil", body: <ServiceCard /> },
  { address: "greenacre.space/network", body: <Travel /> },
];

/** The steps, played out inside a working console. Auto-advances, pauses on hover, any step can be picked. */
function Walkthrough({ s }: { s: Sec }) {
  const steps: { title?: string; text?: string }[] = s.steps?.length ? s.steps : creatorPath;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const at = Math.min(active, steps.length - 1);
  const next = () => setActive((a) => (a + 1) % steps.length);
  const screen = stepScreens[at % stepScreens.length];
  return (
    <section className="wrap lsection" id="path">
      <div className="lhead">
        <SplitHeading text={s.heading ?? ""} className="lh2" dimFrom={3} edit={`${s._key}.heading`} />
      </div>
      <div className="walk" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
        <ol className="walk-steps">
          {steps.map((st, i) => (
            <li key={i}>
              <button type="button" className={`mstep ${i === at ? "on" : ""}`} aria-pressed={i === at} onClick={() => setActive(i)}>
                <b {...edit(s, `steps.${i}.title`)}>{st.title}</b>
                <span className="mstep-text" {...edit(s, `steps.${i}.text`)}>{st.text}</span>
                {i === at && (
                  <span
                    key={at}
                    className="mstep-rail"
                    style={{ animationPlayState: paused ? "paused" : "running" }}
                    onAnimationEnd={next}
                    aria-hidden
                  />
                )}
              </button>
            </li>
          ))}
        </ol>
        <Reveal className="walk-screen">
          <ConsoleFrame address={screen.address}>
            <div className="walk-body" key={at}>
              {screen.body}
            </div>
          </ConsoleFrame>
        </Reveal>
      </div>
    </section>
  );
}

/** One statement, full screen, with agents calling services underneath it. */
function Statement({ s }: { s: Sec }) {
  return (
    <Scene center className="scene--statement">
      <SplitHeading text={s.heading ?? ""} className="scene-title" dimFrom={3} edit={`${s._key}.heading`} />
      <Reveal>
        <p className="scene-sub" {...edit(s, "text")}>{s.text}</p>
      </Reveal>
      <Reveal delay={0.1} className="statement-log">
        <ConsoleFrame address="greenacre.space/requests">
          <AgentLog rows={5} />
        </ConsoleFrame>
      </Reveal>
    </Scene>
  );
}

export default function HowItWorksPage() {
  const list = useSections(defaults);
  return (
    <main className="inner live">
      <Sections
        list={list}
        registry={{
          "page-hero": (s) => <Hero s={s} />,
          walkthrough: (s) => <Walkthrough s={s} />,
          statement: (s) => <Statement s={s} />,
          chapter: (s, nth) => <Chapter s={s} flip={nth % 2 === 1} />,
          faq: (s) => <Faq id="faq" title={s.heading} items={s.items ?? []} paper={!!s.light} note={s.note || undefined} editKey={s._key} />,
          "cta-band": (s) => <CtaBand s={s} />,
        }}
      />
    </main>
  );
}
