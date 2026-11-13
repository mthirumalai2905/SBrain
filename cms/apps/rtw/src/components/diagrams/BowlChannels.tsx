"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

const listeners = [
  { x: 520, y: 18, label: "Household view" },
  { x: 520, y: 92, label: "Restock watch" },
  { x: 520, y: 166, label: "No listener" },
];

export function BowlChannels() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        The bowl reports. The linking path decides who may hear it.
      </div>
      <div className="diagram-grid px-3 py-8">
        <svg viewBox="0 0 860 250" className="mx-auto h-auto w-full max-w-3xl" role="img">
          <rect x="30" y="80" width="190" height="80" fill="var(--bg-elev)" stroke="var(--accent)" />
          <text x="125" y="114" textAnchor="middle" fill="var(--ink)" fontSize="14">
            Bowl ghost
          </text>
          <text
            x="125"
            y="136"
            textAnchor="middle"
            fill="var(--muted)"
            fontSize="11"
            fontFamily="ui-monospace, monospace"
          >
            light reading
          </text>

          <FlowArrow x1={230} y1={120} x2={290} y2={120} />

          <rect x="290" y="80" width="180" height="80" fill="var(--accent-dim)" stroke="var(--accent)" />
          <text x="380" y="114" textAnchor="middle" fill="var(--ink)" fontSize="14">
            Data channel
          </text>
          <text
            x="380"
            y="136"
            textAnchor="middle"
            fill="var(--muted)"
            fontSize="11"
            fontFamily="ui-monospace, monospace"
          >
            authorized links
          </text>

          {listeners.map((item) => (
            <g key={item.label}>
              <rect
                x={item.x}
                y={item.y}
                width="310"
                height="56"
                fill="var(--bg-elev)"
                stroke="var(--line)"
              />
              <text
                x={item.x + 155}
                y={item.y + 34}
                textAnchor="middle"
                fill="var(--ink)"
                fontSize="13"
              >
                {item.label}
              </text>
            </g>
          ))}

          <FlowArrow x1={480} y1={100} x2={520} y2={46} />
          <FlowArrow x1={480} y1={120} x2={520} y2={120} />
          <FlowArrow x1={480} y1={140} x2={520} y2={194} />
        </svg>
      </div>
    </div>
  );
}
