"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

export function LampGhost() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        One endpoint. One ghost. Addressable both ways.
      </div>
      <div className="diagram-grid px-3 py-8">
        <svg viewBox="0 0 720 220" className="mx-auto h-auto w-full max-w-2xl" role="img">
          <rect x="40" y="50" width="200" height="100" fill="var(--node)" stroke="var(--line)" />
          <text x="140" y="92" textAnchor="middle" fill="var(--ink)" fontSize="14">
            Lamp
          </text>
          <text x="140" y="114" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            endpoint
          </text>

          <FlowArrow x1={250} y1={90} x2={470} y2={90} />
          <FlowArrow x1={470} y1={110} x2={250} y2={110} />
          <text x="360" y="78" textAnchor="middle" fill="var(--accent)" fontSize="10" fontFamily="ui-monospace, monospace">
            1 : 1
          </text>
          <text x="360" y="148" textAnchor="middle" fill="var(--muted)" fontSize="10">
            bijective
          </text>

          <rect x="480" y="50" width="200" height="100" fill="var(--accent-dim)" stroke="var(--accent)" />
          <text x="580" y="92" textAnchor="middle" fill="var(--ink)" fontSize="14">
            Ghost
          </text>
          <text x="580" y="114" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            live stand-in
          </text>

          <text x="360" y="198" textAnchor="middle" fill="var(--muted)" fontSize="11">
            Identity, behavior, and context while the connection is active
          </text>
        </svg>
      </div>
    </div>
  );
}
