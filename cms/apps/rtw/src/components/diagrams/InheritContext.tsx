"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

export function InheritContext() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        The object stays itself. The service supplies the context.
      </div>
      <div className="diagram-grid px-3 py-8">
        <svg viewBox="0 0 860 230" className="mx-auto h-auto w-full max-w-3xl" role="img">
          <rect x="20" y="50" width="200" height="90" fill="var(--node)" stroke="var(--line)" />
          <text x="120" y="86" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Temperature
          </text>
          <text x="120" y="108" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            one reading
          </text>

          <FlowArrow x1={230} y1={95} x2={290} y2={95} />
          <text x="260" y="82" textAnchor="middle" fill="var(--accent)" fontSize="9" fontFamily="ui-monospace, monospace">
            morph
          </text>

          <rect x="300" y="50" width="230" height="90" fill="var(--accent-dim)" stroke="var(--accent)" />
          <text x="415" y="86" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Light service
          </text>
          <text x="415" y="108" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            secondary context
          </text>

          <FlowArrow x1={540} y1={95} x2={600} y2={95} />

          <rect x="610" y="50" width="230" height="90" fill="var(--node)" stroke="var(--line)" />
          <text x="725" y="86" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Same sensor
          </text>
          <text x="725" y="108" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            now used as a switch
          </text>

          <text x="430" y="190" textAnchor="middle" fill="var(--muted)" fontSize="11">
            Withdraw the morph and the light service goes dark. The sensor still reads.
          </text>
        </svg>
      </div>
    </div>
  );
}
