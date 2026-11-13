"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

const steps = ["Need", "Simulate", "Assemble", "Link", "Serve", "Dissolve", "Learn"];

export function EmergenceCycle() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        A system that exists only while it is needed
      </div>
      <div className="diagram-grid px-3 py-8">
        <svg viewBox="0 0 860 230" className="mx-auto h-auto w-full max-w-3xl" role="img">
          {steps.map((label, index) => {
            const x = 28 + index * 118;
            const accent = index === 4;
            return (
              <g key={label}>
                <rect
                  x={x}
                  y="70"
                  width="100"
                  height="64"
                  fill={accent ? "var(--accent-dim)" : "var(--bg-elev)"}
                  stroke={accent ? "var(--accent)" : "var(--line)"}
                />
                <text
                  x={x + 50}
                  y="108"
                  textAnchor="middle"
                  fill="var(--ink)"
                  fontSize="13"
                >
                  {label}
                </text>
                {index < steps.length - 1 ? (
                  <FlowArrow x1={x + 100} y1={102} x2={x + 118} y2={102} />
                ) : null}
              </g>
            );
          })}
          <path
            d="M 854 102 C 854 168 28 168 28 102"
            fill="none"
            stroke="var(--line)"
            strokeWidth="1.25"
          />
          <polygon points="28,102 34,96 34,108" fill="var(--line)" />
          <text x="430" y="200" textAnchor="middle" fill="var(--muted)" fontSize="11">
            If it is needed again, it is regenerated. Storing it is the waste.
          </text>
        </svg>
      </div>
    </div>
  );
}
