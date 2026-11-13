"use client";

import { FlowArrow } from "@/components/diagrams/FlowArrow";

const receivers = [
  {
    x: 40,
    label: "Robot",
    sub: "local model",
    shape: "triangle" as const,
  },
  {
    x: 330,
    label: "Service",
    sub: "local model",
    shape: "square" as const,
  },
  {
    x: 620,
    label: "Agent",
    sub: "local model",
    shape: "pentagon" as const,
  },
];

function LocalShape({ kind, cx, cy }: { kind: "triangle" | "square" | "pentagon"; cx: number; cy: number }) {
  if (kind === "triangle") {
    return <polygon points={`${cx},${cy - 18} ${cx - 20},${cy + 16} ${cx + 20},${cy + 16}`} fill="var(--bg)" stroke="var(--accent)" strokeWidth="1.5" />;
  }
  if (kind === "square") {
    return <rect x={cx - 16} y={cy - 16} width="32" height="32" fill="var(--bg)" stroke="var(--accent)" strokeWidth="1.5" />;
  }
  return (
    <polygon
      points={`${cx},${cy - 18} ${cx + 17},${cy - 6} ${cx + 11},${cy + 16} ${cx - 11},${cy + 16} ${cx - 17},${cy - 6}`}
      fill="var(--bg)"
      stroke="var(--accent)"
      strokeWidth="1.5"
    />
  );
}

export function ShapeFan() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        One live source. Three local shapes.
      </div>
      <div className="diagram-grid px-3 py-8">
        <svg
          viewBox="0 0 860 340"
          className="mx-auto h-auto w-full max-w-3xl"
          role="img"
          aria-label="A live source fans into a robot, a service, and an agent. Each receives the same stream in its own local shape."
        >
          <text
            x="430"
            y="22"
            textAnchor="middle"
            fill="var(--ink)"
            fontSize="13"
          >
            Live source
          </text>
          <circle cx="430" cy="64" r="34" fill="var(--accent-dim)" />
          <circle cx="430" cy="64" r="22" fill="var(--bg-elev)" stroke="var(--accent)" />
          <circle cx="430" cy="64" r="6" fill="var(--accent)" />

          <FlowArrow x1={415} y1={88} x2={155} y2={188} />
          <FlowArrow x1={430} y1={88} x2={430} y2={188} />
          <FlowArrow x1={445} y1={88} x2={705} y2={188} />

          <text
            x="250"
            y="150"
            textAnchor="middle"
            fill="var(--accent)"
            fontSize="10"
            fontFamily="ui-monospace, monospace"
          >
            morph
          </text>
          <text
            x="448"
            y="140"
            textAnchor="start"
            fill="var(--accent)"
            fontSize="10"
            fontFamily="ui-monospace, monospace"
          >
            morph
          </text>
          <text
            x="610"
            y="150"
            textAnchor="middle"
            fill="var(--accent)"
            fontSize="10"
            fontFamily="ui-monospace, monospace"
          >
            morph
          </text>

          {receivers.map((item) => {
            const cx = item.x + 100;
            return (
              <g key={item.label}>
                <rect
                  x={item.x}
                  y="196"
                  width="200"
                  height="100"
                  fill="var(--bg-elev)"
                  stroke="var(--line)"
                />
                <LocalShape kind={item.shape} cx={cx} cy={232} />
                <text x={cx} y="268" textAnchor="middle" fill="var(--ink)" fontSize="13">
                  {item.label}
                </text>
                <text
                  x={cx}
                  y="286"
                  textAnchor="middle"
                  fill="var(--muted)"
                  fontSize="11"
                  fontFamily="ui-monospace, monospace"
                >
                  {item.sub}
                </text>
              </g>
            );
          })}

          <text x="430" y="326" textAnchor="middle" fill="var(--muted)" fontSize="11">
            Each participant receives the same live stream in the shape it needs.
          </text>
        </svg>
      </div>
    </div>
  );
}
