"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

export function DataChannelMorph() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Linking path: data is morphed in local context
      </div>
      <div className="diagram-grid px-3 py-8">
        <svg viewBox="0 0 860 210" className="mx-auto h-auto w-full max-w-3xl" role="img">
          {[
            { x: 20, label: "Source", sub: "sensor ghost" },
            { x: 230, label: "Service A", sub: "local model" },
            { x: 440, label: "Service B", sub: "local model" },
            { x: 650, label: "User ghost", sub: "data channel" },
          ].map((node) => (
            <g key={node.x}>
              <rect x={node.x} y="70" width="170" height="70" fill="var(--node)" stroke="var(--line)" />
              <text x={node.x + 85} y="100" textAnchor="middle" fill="var(--ink)" fontSize="13">
                {node.label}
              </text>
              <text
                x={node.x + 85}
                y="120"
                textAnchor="middle"
                fill="var(--muted)"
                fontSize="11"
                fontFamily="ui-monospace, monospace"
              >
                {node.sub}
              </text>
            </g>
          ))}
          {[190, 400, 610].map((x) => (
            <g key={x}>
              <FlowArrow x1={x} y1={105} x2={x + 40} y2={105} />
              <text x={x + 20} y="96" textAnchor="middle" fill="var(--accent)" fontSize="9" fontFamily="ui-monospace, monospace">
                morph
              </text>
            </g>
          ))}
          <text x="430" y="30" textAnchor="middle" fill="var(--muted)" fontSize="11">
            Each node operates only on local data structures
          </text>
          <text x="430" y="190" textAnchor="middle" fill="var(--muted)" fontSize="11">
            Data is consumed at the endpoint when ghosts at both ends are owned by the same user
          </text>
        </svg>
      </div>
    </div>
  );
}
