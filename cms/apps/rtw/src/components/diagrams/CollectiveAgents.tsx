"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

const agents = [
  { x: 80, y: 36, label: "Motion" },
  { x: 620, y: 36, label: "Temperature" },
  { x: 80, y: 150, label: "Behavior" },
  { x: 620, y: 150, label: "Logistics" },
];

export function CollectiveAgents() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Specialists share a language, not each other’s private data
      </div>
      <div className="diagram-grid px-3 py-8">
        <svg viewBox="0 0 860 250" className="mx-auto h-auto w-full max-w-3xl" role="img">
          <rect x="290" y="78" width="280" height="90" fill="var(--bg-elev)" stroke="var(--accent)" />
          <text x="430" y="114" textAnchor="middle" fill="var(--ink)" fontSize="14">
            Morphic service
          </text>
          <text
            x="430"
            y="136"
            textAnchor="middle"
            fill="var(--muted)"
            fontSize="11"
            fontFamily="ui-monospace, monospace"
          >
            what it is · what it does · how it transforms
          </text>

          {agents.map((agent) => (
            <g key={agent.label}>
              <rect
                x={agent.x}
                y={agent.y}
                width="160"
                height="56"
                fill="var(--bg-elev)"
                stroke="var(--line)"
              />
              <text
                x={agent.x + 80}
                y={agent.y + 34}
                textAnchor="middle"
                fill="var(--ink)"
                fontSize="13"
              >
                {agent.label}
              </text>
            </g>
          ))}

          <FlowArrow x1={240} y1={64} x2={290} y2={100} />
          <FlowArrow x1={620} y1={64} x2={570} y2={100} />
          <FlowArrow x1={240} y1={178} x2={290} y2={146} />
          <FlowArrow x1={620} y1={178} x2={570} y2={146} />
        </svg>
      </div>
    </div>
  );
}
