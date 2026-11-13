"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

export function UmbrellaReturn() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        The service talks to the umbrella. The umbrella talks back.
      </div>
      <div className="diagram-grid px-3 py-8">
        <svg viewBox="0 0 860 230" className="mx-auto h-auto w-full max-w-3xl" role="img">
          <rect x="30" y="56" width="220" height="88" fill="var(--bg-elev)" stroke="var(--line)" />
          <text x="140" y="94" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Weather service
          </text>
          <text x="140" y="116" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            rain · lightning
          </text>

          <FlowArrow x1={260} y1={86} x2={330} y2={86} />
          <FlowArrow x1={330} y1={114} x2={260} y2={114} />

          <rect x="330" y="56" width="200" height="88" fill="var(--accent-dim)" stroke="var(--accent)" />
          <text x="430" y="94" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Umbrella
          </text>
          <text x="430" y="116" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            colour · raindrops
          </text>

          <FlowArrow x1={540} y1={86} x2={610} y2={86} />
          <FlowArrow x1={610} y1={114} x2={540} y2={114} />

          <rect x="610" y="56" width="220" height="88" fill="var(--bg-elev)" stroke="var(--line)" />
          <text x="720" y="94" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Live map
          </text>
          <text x="720" y="116" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="ui-monospace, monospace">
            it is raining here
          </text>

          <text x="430" y="190" textAnchor="middle" fill="var(--muted)" fontSize="11">
            Open the umbrella and it appears on the map. Count drops and the station learns.
          </text>
        </svg>
      </div>
    </div>
  );
}
