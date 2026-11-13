"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

export function ConceptRtw() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Figure 3-1 concept: Bijective Network System (redrawn from source description)
      </div>
      <div className="diagram-grid px-4 py-8">
        <svg viewBox="0 0 760 260" className="mx-auto h-auto w-full max-w-3xl" role="img">
          <rect x="40" y="30" width="200" height="70" fill="var(--node)" stroke="var(--line)" />
          <text x="140" y="60" textAnchor="middle" fill="var(--ink)" fontSize="13">
            World Wide Web
          </text>
          <text x="140" y="78" textAnchor="middle" fill="var(--muted)" fontSize="10">
            documents · media
          </text>

          <rect x="280" y="20" width="200" height="90" fill="var(--accent-dim)" stroke="var(--accent)" />
          <text x="380" y="55" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Real-Time Web
          </text>
          <text x="380" y="74" textAnchor="middle" fill="var(--muted)" fontSize="10">
            live bidirectional channels
          </text>

          <rect x="520" y="30" width="200" height="70" fill="var(--node)" stroke="var(--line)" />
          <text x="620" y="60" textAnchor="middle" fill="var(--ink)" fontSize="13">
            Physical world
          </text>
          <text x="620" y="78" textAnchor="middle" fill="var(--muted)" fontSize="10">
            devices · sensors · people
          </text>

          <FlowArrow x1={240} y1={65} x2={280} y2={65} color="var(--muted)" />
          <FlowArrow x1={480} y1={65} x2={520} y2={65} />

          <text x="380" y="150" textAnchor="middle" fill="var(--muted)" fontSize="11">
            Dynamic data channels connect IoE resources to a service, application, or page
          </text>
          <text x="380" y="172" textAnchor="middle" fill="var(--muted)" fontSize="11">
            for a specific user instance, concurrently with the existing Web
          </text>

          <rect
            data-flow="slow"
            x="160"
            y="196"
            width="440"
            height="36"
            fill="transparent"
            stroke="var(--accent)"
            strokeDasharray="5 7"
          />
          <text x="380" y="218" textAnchor="middle" fill="var(--accent)" fontSize="11" fontFamily="ui-monospace, monospace">
            Internet of Everything participants
          </text>
        </svg>
      </div>
    </div>
  );
}
