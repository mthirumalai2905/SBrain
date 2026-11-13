"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

export function ShoeKeyboard() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Motion becomes a letter only inside the service that asked for letters
      </div>
      <div className="diagram-grid px-3 py-8">
        <svg viewBox="0 0 860 230" className="mx-auto h-auto w-full max-w-3xl" role="img">
          <rect x="20" y="50" width="170" height="90" fill="var(--bg-elev)" stroke="var(--line)" />
          <text x="105" y="88" textAnchor="middle" fill="var(--ink)" fontSize="13">
            A step
          </text>
          <text x="105" y="110" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            motion sensor
          </text>

          <FlowArrow x1={200} y1={95} x2={250} y2={95} />

          <rect x="250" y="50" width="190" height="90" fill="var(--bg-elev)" stroke="var(--line)" />
          <text x="345" y="88" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Semantics
          </text>
          <text x="345" y="110" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            this gesture means H
          </text>

          <FlowArrow x1={450} y1={95} x2={500} y2={95} />

          <rect x="500" y="50" width="150" height="90" fill="var(--accent-dim)" stroke="var(--accent)" />
          <text x="575" y="88" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Letter
          </text>
          <text x="575" y="110" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            local model
          </text>

          <FlowArrow x1={660} y1={95} x2={710} y2={95} />

          <rect x="710" y="50" width="130" height="90" fill="var(--bg-elev)" stroke="var(--line)" />
          <text x="775" y="88" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Hello
          </text>
          <text x="775" y="110" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            World
          </text>

          <text x="430" y="190" textAnchor="middle" fill="var(--muted)" fontSize="11">
            Leave the keyboard service and the same step is only a step again.
          </text>
        </svg>
      </div>
    </div>
  );
}
