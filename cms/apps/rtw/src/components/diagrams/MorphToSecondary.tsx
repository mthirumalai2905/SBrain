"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

export function MorphToSecondary() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Morphing grants read access and reshapes data into a local model
      </div>
      <div className="diagram-grid px-3 py-8">
        <svg viewBox="0 0 860 230" className="mx-auto h-auto w-full max-w-3xl" role="img">
          <rect x="20" y="50" width="190" height="90" fill="var(--node)" stroke="var(--line)" />
          <text x="115" y="88" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Lamp ghost
          </text>
          <text x="115" y="110" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            source model
          </text>

          <FlowArrow x1={220} y1={95} x2={280} y2={95} />
          <text x="250" y="82" textAnchor="middle" fill="var(--accent)" fontSize="9" fontFamily="ui-monospace, monospace">
            morph
          </text>

          <rect x="290" y="50" width="220" height="90" fill="var(--accent-dim)" stroke="var(--accent)" />
          <text x="400" y="88" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Scheduler
          </text>
          <text x="400" y="110" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            secondary service
          </text>

          <FlowArrow x1={520} y1={95} x2={580} y2={95} />

          <rect x="590" y="50" width="250" height="90" fill="var(--node)" stroke="var(--line)" />
          <text x="715" y="88" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Local model
          </text>
          <text x="715" y="110" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            only this service sees the reshape
          </text>

          <text x="430" y="190" textAnchor="middle" fill="var(--muted)" fontSize="11">
            The owner can withdraw the morph. The lamp service keeps working.
          </text>
        </svg>
      </div>
    </div>
  );
}
