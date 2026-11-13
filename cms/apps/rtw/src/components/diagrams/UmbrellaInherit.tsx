"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

export function UmbrellaInherit() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        The umbrella stays an umbrella. The service is the brain.
      </div>
      <div className="diagram-grid px-3 py-8">
        <svg viewBox="0 0 860 230" className="mx-auto h-auto w-full max-w-3xl" role="img">
          <rect x="20" y="50" width="200" height="90" fill="var(--bg-elev)" stroke="var(--line)" />
          <text x="120" y="88" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Smart umbrella
          </text>
          <text x="120" y="110" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            object · radio · sensors
          </text>

          <FlowArrow x1={230} y1={95} x2={290} y2={95} />
          <text x="260" y="82" textAnchor="middle" fill="var(--accent)" fontSize="9" fontFamily="ui-monospace, monospace">
            attach
          </text>

          <rect x="300" y="50" width="230" height="90" fill="var(--accent-dim)" stroke="var(--accent)" />
          <text x="415" y="88" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Morphic service
          </text>
          <text x="415" y="110" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            weather · date · door
          </text>

          <FlowArrow x1={540} y1={95} x2={600} y2={95} />
          <text x="570" y="82" textAnchor="middle" fill="var(--accent)" fontSize="9" fontFamily="ui-monospace, monospace">
            inherit
          </text>

          <rect x="610" y="50" width="230" height="90" fill="var(--bg-elev)" stroke="var(--line)" />
          <text x="725" y="88" textAnchor="middle" fill="var(--ink)" fontSize="13">
            New behaviour
          </text>
          <text x="725" y="110" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            colour · map · alert
          </text>

          <text x="430" y="190" textAnchor="middle" fill="var(--muted)" fontSize="11">
            Change the link and the brain changes. The object does not.
          </text>
        </svg>
      </div>
    </div>
  );
}
