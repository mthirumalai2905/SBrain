"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

export function DataVsInfo() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="grid md:grid-cols-2">
        <div className="border-b border-[var(--line)] p-5 md:border-b-0 md:border-r">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Information
          </div>
          <svg viewBox="0 0 320 150" className="mt-4 h-auto w-full" role="img">
            <rect x="20" y="28" width="90" height="40" fill="var(--node)" stroke="var(--line)" />
            <text x="65" y="52" textAnchor="middle" fill="var(--ink)" fontSize="11">
              Request
            </text>
            <FlowArrow x1={110} y1={48} x2={160} y2={48} color="var(--muted)" />
            <rect x="160" y="20" width="140" height="56" fill="var(--node)" stroke="var(--line)" />
            <text x="230" y="44" textAnchor="middle" fill="var(--ink)" fontSize="11">
              Stored page
            </text>
            <text x="230" y="62" textAnchor="middle" fill="var(--muted)" fontSize="10">
              historical
            </text>
            <text x="160" y="110" textAnchor="middle" fill="var(--muted)" fontSize="10">
              You ask. A copy comes back.
            </text>
            <text x="160" y="128" textAnchor="middle" fill="var(--muted)" fontSize="10">
              The source may not know you looked.
            </text>
          </svg>
        </div>
        <div className="p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
            Live data
          </div>
          <svg viewBox="0 0 320 150" className="mt-4 h-auto w-full" role="img">
            <rect x="20" y="28" width="90" height="40" fill="var(--node)" stroke="var(--accent)" />
            <text x="65" y="52" textAnchor="middle" fill="var(--ink)" fontSize="11">
              Source
            </text>
            <FlowArrow x1={110} y1={40} x2={160} y2={40} />
            <FlowArrow x1={160} y1={56} x2={110} y2={56} />
            <rect x="160" y="20" width="140" height="56" fill="var(--accent-dim)" stroke="var(--accent)" />
            <text x="230" y="44" textAnchor="middle" fill="var(--ink)" fontSize="11">
              Authorized end
            </text>
            <text x="230" y="62" textAnchor="middle" fill="var(--muted)" fontSize="10">
              as it happens
            </text>
            <text x="160" y="110" textAnchor="middle" fill="var(--muted)" fontSize="10">
              The value stays with the source.
            </text>
            <text x="160" y="128" textAnchor="middle" fill="var(--muted)" fontSize="10">
              It moves when someone is listening.
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
