"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

export function PocShape() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        What a 24-hour RTW proof is for
      </div>
      <div className="diagram-grid px-3 py-8">
        <svg viewBox="0 0 860 220" className="mx-auto h-auto w-full max-w-3xl" role="img">
          {[
            { x: 20, label: "One owner" },
            { x: 190, label: "One channel" },
            { x: 360, label: "Sense" },
            { x: 530, label: "Decide" },
            { x: 700, label: "A live effect" },
          ].map((step, index, list) => (
            <g key={step.label}>
              <rect
                x={step.x}
                y="56"
                width="140"
                height="80"
                fill={index === 4 ? "var(--accent-dim)" : "var(--bg-elev)"}
                stroke={index === 4 ? "var(--accent)" : "var(--line)"}
              />
              <text x={step.x + 70} y="102" textAnchor="middle" fill="var(--ink)" fontSize="13">
                {step.label}
              </text>
              {index < list.length - 1 ? (
                <FlowArrow x1={step.x + 140} y1={96} x2={list[index + 1].x} y2={96} />
              ) : null}
            </g>
          ))}
          <text x="430" y="184" textAnchor="middle" fill="var(--muted)" fontSize="11">
            Not a chatbot wrapper. Not a stored inbox. A source that moves, and something that reacts.
          </text>
        </svg>
      </div>
    </div>
  );
}
