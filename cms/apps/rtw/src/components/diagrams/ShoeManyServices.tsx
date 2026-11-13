"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

const services = [
  { x: 290, y: 28, label: "Keyboard" },
  { x: 530, y: 28, label: "Live map" },
  { x: 290, y: 148, label: "Stride" },
  { x: 530, y: 148, label: "Any other" },
];

export function ShoeManyServices() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        One object. As many services as you attach. None has to own the shoe.
      </div>
      <div className="diagram-grid px-3 py-8">
        <svg viewBox="0 0 860 250" className="mx-auto h-auto w-full max-w-3xl" role="img">
          <rect x="30" y="80" width="180" height="80" fill="var(--bg-elev)" stroke="var(--accent)" />
          <text x="120" y="114" textAnchor="middle" fill="var(--ink)" fontSize="14">
            The shoe
          </text>
          <text
            x="120"
            y="136"
            textAnchor="middle"
            fill="var(--muted)"
            fontSize="11"
            fontFamily="ui-monospace, monospace"
          >
            one endpoint
          </text>

          {services.map((service) => (
            <g key={service.label}>
              <rect
                x={service.x}
                y={service.y}
                width="200"
                height="56"
                fill="var(--bg-elev)"
                stroke="var(--line)"
              />
              <text
                x={service.x + 100}
                y={service.y + 34}
                textAnchor="middle"
                fill="var(--ink)"
                fontSize="13"
              >
                {service.label}
              </text>
            </g>
          ))}

          <FlowArrow x1={220} y1={100} x2={290} y2={56} />
          <FlowArrow x1={220} y1={110} x2={530} y2={56} />
          <FlowArrow x1={220} y1={140} x2={290} y2={176} />
          <FlowArrow x1={220} y1={150} x2={530} y2={176} />
        </svg>
      </div>
    </div>
  );
}
