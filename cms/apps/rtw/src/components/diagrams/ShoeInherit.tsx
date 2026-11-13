"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

export function ShoeInherit() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        The shoe stays a shoe. The service supplies the property.
      </div>
      <div className="diagram-grid px-3 py-8">
        <svg viewBox="0 0 860 230" className="mx-auto h-auto w-full max-w-3xl" role="img">
          <rect x="20" y="50" width="190" height="90" fill="var(--bg-elev)" stroke="var(--line)" />
          <text x="115" y="88" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Smart shoe
          </text>
          <text x="115" y="110" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            motion · energy · radio
          </text>

          <FlowArrow x1={220} y1={95} x2={280} y2={95} />
          <text x="250" y="82" textAnchor="middle" fill="var(--accent)" fontSize="9" fontFamily="ui-monospace, monospace">
            register
          </text>

          <rect x="290" y="50" width="230" height="90" fill="var(--accent-dim)" stroke="var(--accent)" />
          <text x="405" y="88" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Morphic service
          </text>
          <text x="405" y="110" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            defines behaviour
          </text>

          <FlowArrow x1={530} y1={95} x2={590} y2={95} />
          <text x="560" y="82" textAnchor="middle" fill="var(--accent)" fontSize="9" fontFamily="ui-monospace, monospace">
            inherit
          </text>

          <rect x="600" y="50" width="240" height="90" fill="var(--bg-elev)" stroke="var(--line)" />
          <text x="720" y="88" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Same object
          </text>
          <text x="720" y="110" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            new characteristics
          </text>

          <text x="430" y="190" textAnchor="middle" fill="var(--muted)" fontSize="11">
            The physical limit is the sensor. The property is defined on the network.
          </text>
        </svg>
      </div>
    </div>
  );
}
