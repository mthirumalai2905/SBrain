"use client";

import { useEffect, useRef, useState } from "react";
import { startMatrixRain } from "@/components/MatrixRain";

export function RobotNote({
  src,
  side,
  lines,
  editPath,
}: {
  src: string;
  side: "left" | "right";
  lines: readonly [string, string];
  editPath?: string;
}) {
  const root = useRef<HTMLElement>(null);
  const script = lines.join("\n");
  const [count, setCount] = useState(0);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(script.length);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setOn(true);
        observer.disconnect();
      },
      { threshold: 0.45 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [script]);

  useEffect(() => {
    if (!on || count >= script.length) return;
    const next = script[count];
    const id = window.setTimeout(() => setCount((value) => value + 1), next === "\n" ? 420 : 28);
    return () => window.clearTimeout(id);
  }, [on, count, script]);

  const shown = script.slice(0, count);

  return (
    <aside className={`robot-note ${side}`} ref={root} aria-label={lines.join(" ")} {...(editPath ? { "data-synx-edit": editPath } : {})}>
      <button type="button" className="robot-hit" onClick={startMatrixRain} aria-label="Wake the robot">
        <img src={src} alt="" />
      </button>
      <div className="robot-term">
        <div className="robot-term-bar">
          <span />
          <span />
          <span />
          <small>node@synx</small>
        </div>
        <pre aria-hidden="true">
          <span className="robot-prompt">▸ </span>
          {shown}
          <i className={count >= script.length ? "robot-caret idle" : "robot-caret"} />
        </pre>
      </div>
    </aside>
  );
}
