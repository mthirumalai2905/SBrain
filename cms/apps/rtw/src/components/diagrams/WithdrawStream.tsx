"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

export function WithdrawStream() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Autonomy granted, and withdrawn, at the source
      </div>
      <div className="diagram-grid px-3 py-8">
        <svg viewBox="0 0 860 220" className="mx-auto h-auto w-full max-w-3xl" role="img">
          <rect x="30" y="56" width="190" height="88" fill="var(--bg-elev)" stroke="var(--line)" />
          <text x="125" y="94" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Owner
          </text>
          <text
            x="125"
            y="116"
            textAnchor="middle"
            fill="var(--muted)"
            fontSize="11"
            fontFamily="ui-monospace, monospace"
          >
            data layer
          </text>

          <FlowArrow x1={220} y1={100} x2={280} y2={100} />

          <rect x="280" y="56" width="230" height="88" fill="var(--accent-dim)" stroke="var(--accent)" />
          <text x="395" y="94" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Live stream
          </text>
          <text
            x="395"
            y="116"
            textAnchor="middle"
            fill="var(--muted)"
            fontSize="11"
            fontFamily="ui-monospace, monospace"
          >
            can be withdrawn
          </text>

          <FlowArrow x1={510} y1={100} x2={570} y2={100} />

          <rect x="570" y="56" width="260" height="88" fill="var(--bg-elev)" stroke="var(--line)" />
          <text x="700" y="94" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Machine
          </text>
          <text
            x="700"
            y="116"
            textAnchor="middle"
            fill="var(--muted)"
            fontSize="11"
            fontFamily="ui-monospace, monospace"
          >
            channels, does not own
          </text>

          <text x="430" y="186" textAnchor="middle" fill="var(--muted)" fontSize="11">
            Stop the machine by silencing the intelligence that drives it.
          </text>
        </svg>
      </div>
    </div>
  );
}
