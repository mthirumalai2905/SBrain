"use client";

import { useEffect, useState } from "react";
import { Reveal } from "./light-zone";
import "@/styles/scenes.css";

type Tag = { label: string; x: number; y: number };

export function SceneHero({
  index,
  title,
  lede,
  image,
  alt,
  tags,
  meta,
  body,
  side = "left",
  editKey,
}: {
  editKey?: string;
  side?: "left" | "right";
  body?: string[];
  index: string;
  title: string;
  lede: string;
  image: string;
  alt: string;
  tags: Tag[];
  meta: { k: string; v: string }[];
}) {
  return (
    <Reveal>
      <header className="sc-hero" data-side={side}>
        <figure className="sc-hero-figure" data-parallax>
          <img src={image} alt={alt} />
          {tags.map((tag) => (
            <span
              key={tag.label}
              className="sc-tag"
              style={{ left: `${tag.x}%`, top: `${tag.y}%`, "--x": `${tag.x}%` } as React.CSSProperties}
            >
              <i />
              {tag.label}
            </span>
          ))}
        </figure>
        <div className="sc-hero-copy">
          <p className="lab-kicker">
            <span>{index}</span>
            {title}
          </p>
          <h1 data-text={title} data-long={title.length > 7 ? "" : undefined} data-synx-edit={editKey && editKey + ".title"}>
            {title}
          </h1>
          <p className="sc-hero-lede" data-synx-edit={editKey && editKey + ".lede"}>{lede}</p>
          {body?.map((text, i) => (
            <p key={text} className="sc-hero-body" data-synx-edit={editKey && editKey + ".body." + i + ".text"}>
              {text}
            </p>
          ))}
          <dl>
            {meta.map((m) => (
              <div key={m.k}>
                <dt>{m.k}</dt>
                <dd>{m.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>
    </Reveal>
  );
}

type TraceStep = { step: string; lines: string };
const split = (t: string): [string, string] => {
  const at = t.indexOf("|");
  return at < 0 ? ["", t.trim()] : [t.slice(0, at).trim(), t.slice(at + 1).trim()];
};

/** The six-step request trace. Each step's lines are written as "who | text", one per line. */
export function RequestTrace({ steps, badge }: { steps: TraceStep[]; badge?: string }) {
  const trace = steps.map((t) => ({ step: t.step, lines: (t.lines ?? "").split("\n").filter(Boolean).map(split) }));
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || !trace.length) return;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % trace.length), 3600);
    return () => window.clearInterval(timer);
  }, [paused, trace.length]);

  if (!trace.length) return null;
  const now = trace[Math.min(active, trace.length - 1)];
  return (
    <div className="sc-trace" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <ol className="sc-trace-steps">
        {trace.map((t, i) => (
          <li key={t.step}>
            <button type="button" aria-pressed={i === active} data-done={i < active ? "" : undefined} onClick={() => setActive(i)}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {t.step}
            </button>
          </li>
        ))}
      </ol>
      <div className="sc-trace-screen" aria-live="polite">
        <header>
          <span>Trace / {now.step}</span>
          {badge ? <em>{badge}</em> : null}
        </header>
        <ul key={active}>
          {trace.slice(0, active + 1).flatMap((t, i) =>
            (i === active ? t.lines : t.lines.slice(-1)).map(([who, text], j) => (
              <li key={`${i}-${j}`} data-who={who} data-new={i === active ? "" : undefined}>
                <b>{i === active ? who : t.step}</b>
                {text}
              </li>
            )),
          )}
        </ul>
      </div>
    </div>
  );
}

type Switch = { id: string; label: string; note: string; locked?: boolean; initial?: boolean };

/** The leash: switches for what an outside model may do, and what that means. */
export function Switchboard({ switches, verdicts, outsideLabel }: { switches: Switch[]; verdicts: { when: string; text: string }[]; outsideLabel?: string }) {
  const [state, setState] = useState<Record<string, boolean>>(() => Object.fromEntries(switches.map((s) => [s.id, !!s.initial])));
  const say = (when: string) => verdicts.find((v) => v.when === when)?.text ?? "";
  const verdict = !state.look ? say("blind") : !state.change ? say("look") : state.confirm ? say("propose") : say("direct");

  return (
    <div className="sc-switch">
      <ul>
        {switches.map((s) => (
          <li key={s.id} data-locked={s.locked ? "" : undefined}>
            <button
              type="button"
              role="switch"
              aria-label={s.label}
              aria-checked={!!state[s.id]}
              disabled={!!s.locked || (s.id === "confirm" && !state.change)}
              onClick={() => setState((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
            >
              <i />
            </button>
            <div>
              <strong>{s.label}</strong>
              <span>{s.note}</span>
            </div>
          </li>
        ))}
      </ul>
      <output className="sc-switch-out">
        <span>{outsideLabel}</span>
        <p>{verdict}</p>
      </output>
    </div>
  );
}

type GraphNode = { id: string; label: string; x: number; y: number };
type Mode = { id: string; label: string; stat: string; body: string };

/** Three ways to wire the same services: a private door each, a warehouse in the middle, or links. Links are written "a > b", one per line. */
export function DoorsVsLinks({ modes, nodes, links: linkText, ownedLabel, warehouseLabel }: { modes: Mode[]; nodes: GraphNode[]; links: string; ownedLabel?: string; warehouseLabel?: string }) {
  const [mode, setMode] = useState(modes[0]?.id ?? "doors");
  const links = (linkText ?? "")
    .split("\n")
    .map((l) => l.split(">").map((x) => x.trim()))
    .filter((p) => p.length === 2 && p[0] && p[1]) as [string, string][];
  const pairs = nodes.flatMap((a, i) => nodes.slice(i + 1).map((b) => [a.id, b.id] as [string, string]));
  const at = (id: string) => nodes.find((n) => n.id === id);
  const current = modes.find((m) => m.id === mode) ?? modes[0];
  const hub = { x: 320, y: 150 };
  if (!current) return null;

  const line = (a: string, b: string, cls: string) => {
    const p = at(a);
    const q = at(b);
    return p && q ? <line key={`${a}${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} className={cls} /> : null;
  };

  return (
    <div className="sc-doors" data-mode={mode}>
      <div className="sc-doors-tabs" role="tablist">
        {modes.map((m) => (
          <button key={m.id} type="button" role="tab" aria-selected={m.id === mode} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="sc-doors-body">
        <svg viewBox="0 0 640 300" role="img" aria-label={current.label}>
          {mode === "doors" && pairs.map(([a, b]) => line(a, b, "sc-edge sc-edge-door"))}
          {mode === "warehouse" && (
            <>
              {nodes.map((n) => (
                <line key={n.id} x1={n.x} y1={n.y} x2={hub.x} y2={hub.y} className="sc-edge sc-edge-copy" />
              ))}
              <rect x={hub.x - 46} y={hub.y - 22} width="92" height="44" className="sc-hub" />
              <text x={hub.x} y={hub.y + 4} className="sc-hub-label">
                {warehouseLabel}
              </text>
            </>
          )}
          {mode === "links" && links.map(([a, b]) => line(a, b, "sc-edge sc-edge-link"))}
          {nodes.map((n) => (
            <g key={n.id} transform={`translate(${n.x} ${n.y})`} className="sc-node">
              <circle r="9" />
              <text y="-18">{n.label}</text>
              {mode !== "warehouse" && (
                <text y="28" className="sc-owner">
                  {ownedLabel}
                </text>
              )}
            </g>
          ))}
        </svg>
        <aside>
          <strong>{current.stat}</strong>
          <p>{current.body}</p>
        </aside>
      </div>
    </div>
  );
}
