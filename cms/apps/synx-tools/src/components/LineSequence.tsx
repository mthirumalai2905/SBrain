"use client";

import { useEffect, useState } from "react";

const lines = [
  "Build the Internet for Autonomous Machines.",
  "Synx gives developers and AI the tools to create, connect and operate services on the Real Time Web.",
  "WWW was built for humans, RTW is built for machines",
  "Developer tools that enable humans and AI to build, connect and operate autonomous services on the Real Time Web.",
];

export function LineSequence() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % lines.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [active]);

  return (
    <div className="wrap split line-seq">
      <div className="copy">
        <div className="section-kicker" aria-hidden="true">
          {String(active + 1).padStart(2, "0")}
        </div>
        <h2 key={active}>{lines[active]}</h2>
      </div>
      <div className="card layers">
        <span className="sunray" aria-hidden="true"></span>
        {lines.map((line, index) => (
          <button
            key={line}
            type="button"
            className={index === active ? "layer on" : "layer"}
            aria-pressed={index === active}
            onClick={() => setActive(index)}
          >
            <span className="mark" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{line}</span>
            <i className="go" aria-hidden="true"></i>
          </button>
        ))}
        <div className="glow" aria-hidden="true"></div>
      </div>
    </div>
  );
}
