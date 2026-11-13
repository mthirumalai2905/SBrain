"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

export function GhostBijection() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Endpoint ↔ Ghost: unique bijective relationship
      </div>
      <div className="diagram-grid px-4 py-8">
        <svg viewBox="0 0 720 220" className="mx-auto h-auto w-full max-w-2xl" role="img">
          <rect
            data-flow="slow"
            x="180"
            y="12"
            width="360"
            height="36"
            fill="transparent"
            stroke="var(--accent)"
            strokeDasharray="5 7"
          />
          <text x="360" y="34" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            Ghost Space: shared coordination environment
          </text>

          <rect x="40" y="70" width="200" height="80" fill="var(--node)" stroke="var(--line)" />
          <text x="140" y="104" textAnchor="middle" fill="var(--ink)" fontSize="14">
            Endpoint
          </text>
          <text x="140" y="124" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            sensor · device · agent
          </text>

          <FlowArrow x1={250} y1={100} x2={470} y2={100} />
          <FlowArrow x1={470} y1={120} x2={250} y2={120} />

          <text x="360" y="88" textAnchor="middle" fill="var(--accent)" fontSize="10" fontFamily="ui-monospace, monospace">
            1 : 1
          </text>
          <text x="360" y="148" textAnchor="middle" fill="var(--muted)" fontSize="10">
            addressable from both sides
          </text>

          <rect x="480" y="70" width="200" height="80" fill="var(--accent-dim)" stroke="var(--accent)" />
          <text x="580" y="104" textAnchor="middle" fill="var(--ink)" fontSize="14">
            Ghost
          </text>
          <text x="580" y="124" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            shared-memory representation
          </text>
        </svg>
      </div>
    </div>
  );
}
