"use client";

import { useEffect, useState } from "react";

export type Appearance = "light" | "dark" | "system";

export function applyAppearance(appearance: Appearance) {
  localStorage.setItem("brain-appearance", appearance);
  const dark = appearance === "dark" || (appearance === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.appearance = appearance;
  window.dispatchEvent(new Event("brain-appearance"));
}

function storedAppearance(): Appearance {
  const stored = localStorage.getItem("brain-appearance");
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

const choices: { id: Appearance; label: string; short: string }[] = [
  { id: "light", label: "Light", short: "Light" },
  { id: "dark", label: "Dark", short: "Dark" },
  { id: "system", label: "System", short: "Auto" },
];

export function AppearanceControl({ variant = "cards" }: { variant?: "cards" | "segment" }) {
  const [appearance, setAppearance] = useState<Appearance>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setAppearance(storedAppearance());
    sync();
    setReady(true);
    window.addEventListener("brain-appearance", sync);
    return () => window.removeEventListener("brain-appearance", sync);
  }, []);

  function choose(next: Appearance) {
    setAppearance(next);
    applyAppearance(next);
  }

  function selected(id: Appearance) {
    return ready && appearance === id;
  }

  if (variant === "segment") {
    return (
      <div className="theme-segment" role="radiogroup" aria-label="Appearance">
        {choices.map((choice) => (
          <button key={choice.id} type="button" role="radio" aria-checked={selected(choice.id)} className={selected(choice.id) ? "on" : undefined} onClick={() => choose(choice.id)}>
            {choice.short}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="theme-cards" role="radiogroup" aria-label="Appearance">
      {choices.map((choice) => (
        <button key={choice.id} type="button" role="radio" aria-checked={selected(choice.id)} className={selected(choice.id) ? "on" : undefined} onClick={() => choose(choice.id)}>
          <span className={`theme-preview ${choice.id}`} aria-hidden="true">
            <span className="theme-preview-bar" />
            <span className="theme-preview-card" />
            <span className="theme-preview-line" />
          </span>
          <span className="theme-name">{choice.label}</span>
        </button>
      ))}
    </div>
  );
}

export function AppearanceRail() {
  const [appearance, setAppearance] = useState<Appearance>("system");

  useEffect(() => {
    const sync = () => setAppearance(storedAppearance());
    sync();
    window.addEventListener("brain-appearance", sync);
    return () => window.removeEventListener("brain-appearance", sync);
  }, []);

  function cycle() {
    const order: Appearance[] = ["light", "dark", "system"];
    const current = storedAppearance();
    const next = order[(Math.max(order.indexOf(current), 0) + 1) % order.length];
    setAppearance(next);
    applyAppearance(next);
  }

  const label = appearance === "light" ? "Light" : appearance === "dark" ? "Dark" : "System";

  return (
    <button className="theme-rail" type="button" onClick={cycle} aria-label={`Appearance, ${label}`}>
      {appearance === "dark" ? <MoonIcon /> : appearance === "light" ? <SunIcon /> : <AutoIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 4.2v2.1M12 17.7v2.1M4.2 12h2.1M17.7 12h2.1M6.4 6.4l1.5 1.5M16.1 16.1l1.5 1.5M17.6 6.4l-1.5 1.5M7.9 16.1l-1.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15.5 4.8a7.2 7.2 0 1 0 3.7 12.2A6.4 6.4 0 0 1 15.5 4.8z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function AutoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4.5" width="14" height="15" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 8.5h14" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
