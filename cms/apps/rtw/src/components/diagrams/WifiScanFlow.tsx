"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

export function WifiScanFlow() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        One board. One cycle. A list that is still moving.
      </div>
      <div className="diagram-grid px-3 py-8">
        <svg viewBox="0 0 860 220" className="mx-auto h-auto w-full max-w-3xl" role="img">
          {[
            { x: 20, label: "ESP8266", sub: "endpoint" },
            { x: 190, label: "Join a router", sub: "then listen" },
            { x: 360, label: "Scan", sub: "SSID and strength" },
            { x: 530, label: "Post", sub: "update the ghost" },
            { x: 700, label: "A live list", sub: "still scanning" },
          ].map((step, index, list) => (
            <g key={step.label}>
              <rect
                x={step.x}
                y="48"
                width="140"
                height="88"
                fill={index === 4 ? "var(--accent-dim)" : "var(--bg-elev)"}
                stroke={index === 4 ? "var(--accent)" : "var(--line)"}
              />
              <text x={step.x + 70} y="86" textAnchor="middle" fill="var(--ink)" fontSize="13">
                {step.label}
              </text>
              <text
                x={step.x + 70}
                y="110"
                textAnchor="middle"
                fill="var(--muted)"
                fontSize="11"
                fontFamily="ui-monospace, monospace"
              >
                {step.sub}
              </text>
              {index < list.length - 1 ? (
                <FlowArrow x1={step.x + 140} y1={92} x2={list[index + 1].x} y2={92} />
              ) : null}
            </g>
          ))}
          <text x="430" y="184" textAnchor="middle" fill="var(--muted)" fontSize="11">
            A blink is one pass. The board does not save a report for later.
          </text>
        </svg>
      </div>
    </div>
  );
}
