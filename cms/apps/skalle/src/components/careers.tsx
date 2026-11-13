"use client";

import { useEffect, useRef, useState } from "react";
import { IconDiscord } from "./Icons";
import { list } from "@/lib/cms";

const CYCLE_MS = 9000;

type Doc = Record<string, any>;

/** The "We're hiring soon" block: headline, terminal, Discord button and the assembling robot. */
export function CareersHero({ d }: { d: Doc }) {
  // "We're *hiring* soon.": every word is glitched on its own, and a word between stars is highlighted
  const words = String(d.headline ?? "").split(" ").filter(Boolean).map((w) => ({ text: w.replace(/\*/g, ""), accent: w.startsWith("*") }));
  return (
    <section className="cy-hero">
      <div className="cy-copy">
        <p className="cy-kicker">
          <span>{d.index}</span> {d.kicker} <em>{d.signal}</em>
        </p>
        <h2 className="cy-title">
          {words.map((w) => (
            <Glitch key={w.text} text={w.text} accent={!!w.accent} />
          ))}
        </h2>
        <p className="cy-lede">{d.lede}</p>
        <Terminal title={d.terminalTitle} lines={list(d.terminal)} />
        {d.ctaUrl ? (
          <a className="cy-cta" href={d.ctaUrl} target="_blank" rel="noreferrer">
            <IconDiscord />
            <span data-text={d.ctaLabel}>{d.ctaLabel}</span>
            <i>↗</i>
          </a>
        ) : null}
      </div>
      <Stage d={d} />
    </section>
  );
}

export function Ticker({ items }: { items: string[] }) {
  return (
    <div className="cy-ticker" aria-hidden="true">
      <div>
        {[0, 1].map((copy) => (
          <span key={copy}>
            {items.map((item) => (
              <b key={item}>
                {item} <i>✦</i>
              </b>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FeedCards({ d }: { d: Doc }) {
  return (
    <section className="cy-feed">
      <p className="cy-kicker">
        <span>{d.tag}</span> {d.kicker}
      </p>
      <div className="cy-cards">
        {list(d.cards).map((item) => (
          <article key={item.id} className="cy-card">
            <header>
              <span>{item.id}</span>
              <i />
            </header>
            <h3 data-text={item.title}>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Glitch({ text, accent = false }: { text: string; accent?: boolean }) {
  return (
    <span className={`cy-glitch${accent ? " cy-glitch-accent" : ""}`} data-text={text}>
      {text}
    </span>
  );
}

function Terminal({ title, lines: terminal }: { title?: string; lines: { prompt: string; text: string }[] }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown >= terminal.length) return;
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => setShown(instant ? terminal.length : shown + 1), instant ? 0 : 420);
    return () => window.clearTimeout(id);
  }, [shown]);

  return (
    <div className="cy-term" role="status">
      <header>
        <span />
        <span />
        <span />
        <p>{title}</p>
      </header>
      <ol>
        {terminal.map((line, index) => (
          <li key={line.prompt} data-on={index < shown ? "" : undefined}>
            <b>&gt; {line.prompt}</b> {line.text}
          </li>
        ))}
        <li className="cy-caret" data-on="">
          <b>&gt;</b> <i />
        </li>
      </ol>
    </div>
  );
}

function Stage({ d }: { d: Doc }) {
  const ROBOT = d.image as string;
  const parts = list(d.parts) as { id: string; x: number; y: number; side: string }[];
  const stage = useRef<HTMLDivElement>(null);
  const status = useRef<HTMLSpanElement>(null);
  const coords = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const cycle = reduce ? 0.7 : ((now - start) % CYCLE_MS) / CYCLE_MS;
      const progress = Math.min(1, cycle / 0.6);
      const build = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const state = progress < 1 ? "building" : cycle > 0.92 ? "reboot" : "online";
      el.style.setProperty("--build", build.toFixed(4));
      el.dataset.state = state;
      if (status.current) {
        status.current.textContent =
          state === "building" ? `Assembly ${String(Math.round(build * 100)).padStart(2, "0")}%` : state === "reboot" ? "Reboot_" : "Online";
      }
      if (!reduce) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const onMove = (event: PointerEvent) => {
      el.style.setProperty("--px", ((event.clientX / window.innerWidth) * 2 - 1).toFixed(3));
      el.style.setProperty("--py", ((event.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      if (coords.current) {
        coords.current.textContent = `X_${String(Math.round(event.clientX)).padStart(4, "0")}\nY_${String(Math.round(event.clientY)).padStart(4, "0")}`;
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className="cy-stage" ref={stage} data-state="building" style={{ "--robot": `url("${ROBOT}")` } as React.CSSProperties}>
      <div className="cy-robot">
        <img className="cy-robot-base" src={ROBOT} alt={d.alt ?? ""} />
        <img className="cy-robot-blueprint" src={ROBOT} alt="" aria-hidden="true" />
        <img className="cy-robot-rgb cy-robot-c" src={ROBOT} alt="" aria-hidden="true" />
        <img className="cy-robot-rgb cy-robot-m" src={ROBOT} alt="" aria-hidden="true" />
        <span className="cy-robot-slice s1" aria-hidden="true" />
        <span className="cy-robot-slice s2" aria-hidden="true" />
        <span className="cy-robot-slice s3" aria-hidden="true" />
        <span className="cy-laser" aria-hidden="true" />
        {parts.map((part) => (
          <span
            key={part.id}
            className={`cy-part cy-part-${part.side}`}
            style={{ left: `${part.x}%`, top: `${part.y}%` }}
            aria-hidden="true"
          >
            <i />
            <b>{part.id}</b>
          </span>
        ))}
      </div>
      <div className="cy-scanlines" />
      <div className="cy-slices" />
      <div className="cy-cross" />
      <div className="cy-hud">
        <p className="cy-rec">
          <i /> Live scan
        </p>
        <p ref={coords} className="cy-coords">
          {"X_0000\nY_0000"}
        </p>
      </div>
      <p className="cy-status">
        <i />
        <span ref={status}>Assembly 00%</span>
      </p>
      <p className="cy-tag">{d.scanTag}</p>
      <p className="cy-vert">{d.scanNote}</p>
      <span className="cy-corner tl" />
      <span className="cy-corner tr" />
      <span className="cy-corner bl" />
      <span className="cy-corner br" />
    </div>
  );
}
