"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

export function EcosystemMap() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        What this site covers. Implementations are independent.
      </div>
      <div className="hidden border-b border-[var(--line)] px-10 py-2 md:block">
        <svg viewBox="0 0 900 28" className="h-7 w-full">
          <FlowArrow x1={220} y1={14} x2={340} y2={14} />
          <FlowArrow x1={560} y1={14} x2={680} y2={14} />
        </svg>
      </div>
      <div className="grid gap-px bg-[var(--line)] md:grid-cols-3">
        {[
          {
            kicker: "What",
            name: "Real Time Web",
            role: "A network architecture for live bidirectional resource relationships",
            action: "Understand the idea",
          },
          {
            kicker: "Why",
            name: "Ownership of live data",
            role: "Keep data with its source instead of copying it into platforms",
            action: "Understand the problem",
          },
          {
            kicker: "MAD",
            name: "Morphic Architecture Design",
            role: "Four independently owned layers, introduced in 2008",
            action: "Understand the blueprint",
          },
        ].map((item) => (
          <div key={item.name} className="bg-[var(--bg)] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
              {item.kicker}
            </div>
            <div className="mt-2 text-[1.05rem] text-[var(--ink)]">{item.name}</div>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--muted)]">{item.role}</p>
            <p className="mt-3 font-mono text-[11px] text-[var(--muted)]">{item.action}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
