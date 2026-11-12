"use client";

import { useEffect, useRef, useState } from "react";
import { startMatrixRain } from "@/components/MatrixRain";

function spoken(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export function Stance({ children, editPath }: { children: string; speaker?: "skalle"; editPath?: string }) {
  const root = useRef<HTMLElement>(null);
  const script = spoken(children);
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
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [script]);

  useEffect(() => {
    if (!on || count >= script.length) return;
    const next = script[count];
    const id = window.setTimeout(() => setCount((value) => value + 1), next === "\n" ? 360 : 18);
    return () => window.clearTimeout(id);
  }, [on, count, script]);

  const shown = script.slice(0, count);

  return (
    <figure className="robot-note stance-said left" ref={root} aria-label={children} {...(editPath ? { "data-synx-edit": editPath } : {})}>
      <button type="button" className="robot-hit" onClick={startMatrixRain} aria-label="Wake the robot">
        <img src="/img/robot-left.jpg" alt="" />
      </button>
      <div className="robot-term" aria-hidden="true">
        <div className="robot-term-bar">
          <span />
          <span />
          <span />
          <small>node@synx</small>
        </div>
        <pre>
          <span className="robot-prompt">▸ </span>
          {shown}
          <i className={count >= script.length && count > 0 ? "robot-caret idle" : "robot-caret"} />
        </pre>
      </div>
    </figure>
  );
}
