"use client";

import { useEffect, useState } from "react";

type Piece = { text: string; kind?: "cmd" | "flag" | "url" | "str" };

const tabs: { id: string; label: string; command: string; lines: Piece[][]; toast: string }[] = [
  {
    id: "send",
    label: "Send",
    command: `curl -k https://your-domain.cioty.com/helloworld -H "Synx-Cat: 1" -d "token=your-token&objectID=3&txt=Hello World"`,
    lines: [
      [
        { text: "curl ", kind: "cmd" },
        { text: "-k ", kind: "flag" },
        { text: "https://your-domain.cioty.com/helloworld ", kind: "url" },
        { text: "\\" },
      ],
      [
        { text: "-H ", kind: "flag" },
        { text: '"Synx-Cat: 1" ', kind: "str" },
        { text: "\\" },
      ],
      [
        { text: "-d ", kind: "flag" },
        { text: '"token=your-token&objectID=3&txt=Hello World"', kind: "str" },
      ],
    ],
    toast: "Hello World sent",
  },
  {
    id: "receive",
    label: "Receive",
    command: `curl -k https://your-domain.cioty.com/helloworld -H "Synx-Cat: 4" -d "token=your-token&objectID=1"`,
    lines: [
      [
        { text: "curl ", kind: "cmd" },
        { text: "-k ", kind: "flag" },
        { text: "https://your-domain.cioty.com/helloworld ", kind: "url" },
        { text: "\\" },
      ],
      [
        { text: "-H ", kind: "flag" },
        { text: '"Synx-Cat: 4" ', kind: "str" },
        { text: "\\" },
      ],
      [
        { text: "-d ", kind: "flag" },
        { text: '"token=your-token&objectID=1"', kind: "str" },
      ],
    ],
    toast: "Message received",
  },
  {
    id: "schema",
    label: "Schema",
    command: `<rtw><txt></txt></rtw>`,
    lines: [
      [
        { text: "<rtw>", kind: "url" },
        { text: "<txt></txt>", kind: "str" },
        { text: "</rtw>", kind: "url" },
      ],
    ],
    toast: "Schema ready",
  },
];

function lengthOf(lines: Piece[][]) {
  return lines.reduce((sum, line) => sum + line.reduce((n, piece) => n + piece.text.length, 0), 0);
}

export function CodePanel() {
  const [active, setActive] = useState("send");
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(0);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  const total = lengthOf(current.lines);
  const done = shown >= total;

  useEffect(() => {
    setShown(0);
    const start = performance.now();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(total);
      return;
    }
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(total, Math.floor((now - start) / 16));
      setShown(next);
      if (next < total) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, total]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(current.command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  let left = shown;

  return (
    <div className="code-panel">
      <span className="tick tl" aria-hidden="true"></span>
      <span className="tick tr" aria-hidden="true"></span>
      <span className="tick bl" aria-hidden="true"></span>
      <span className="tick br" aria-hidden="true"></span>
      <div className="term-bar">
        <div className="term-pills" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === active}
              className={tab.id === active ? "on" : ""}
              onClick={() => setActive(tab.id)}
            >
              {tab.id === active ? "Try it" : tab.label}
            </button>
          ))}
        </div>
        <code className="term-cmd">{current.command}</code>
        <button className="term-copy" type="button" onClick={copy} aria-label="Copy command">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="term-head">
        <span>Terminal</span>
        <i aria-hidden="true"></i>
      </div>
      <div className="term-body" aria-live="polite">
        {current.lines.map((line, index) => {
          if (left <= 0) return null;
          return (
            <div className="term-line" key={index}>
              {line.map((piece, pieceIndex) => {
                if (left <= 0) return null;
                const text = piece.text.slice(0, left);
                left -= text.length;
                return (
                  <span key={pieceIndex} className={piece.kind}>
                    {text}
                  </span>
                );
              })}
            </div>
          );
        })}
        <span className="term-caret" aria-hidden="true"></span>
      </div>
      <div className={`term-toast${done ? " in" : ""}`}>
        <small>your-domain.cioty.com</small>
        <strong>{current.toast}</strong>
      </div>
    </div>
  );
}
