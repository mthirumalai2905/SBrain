"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

export function BowlSense() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        One sensor. One number. A guess at how many are left.
      </div>
      <div className="diagram-grid px-3 py-8">
        <svg viewBox="0 0 860 230" className="mx-auto h-auto w-full max-w-3xl" role="img">
          <rect x="20" y="50" width="180" height="90" fill="var(--bg-elev)" stroke="var(--line)" />
          <text x="110" y="88" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Bowl
          </text>
          <text x="110" y="110" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            oranges
          </text>

          <FlowArrow x1={210} y1={95} x2={260} y2={95} />

          <rect x="260" y="50" width="180" height="90" fill="var(--bg-elev)" stroke="var(--line)" />
          <text x="350" y="88" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Light sensor
          </text>
          <text x="350" y="110" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            one reading
          </text>

          <FlowArrow x1={450} y1={95} x2={500} y2={95} />

          <rect x="500" y="50" width="150" height="90" fill="var(--accent-dim)" stroke="var(--accent)" />
          <text x="575" y="88" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Estimate
          </text>
          <text x="575" y="110" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            not a count
          </text>

          <FlowArrow x1={660} y1={95} x2={710} y2={95} />

          <rect x="710" y="50" width="130" height="90" fill="var(--bg-elev)" stroke="var(--line)" />
          <text x="775" y="88" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Ghost
          </text>
          <text x="775" y="110" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            live update
          </text>

          <text x="430" y="190" textAnchor="middle" fill="var(--muted)" fontSize="11">
            Take one orange and the light changes. That is all the body can say.
          </text>
        </svg>
      </div>
    </div>
  );
}
