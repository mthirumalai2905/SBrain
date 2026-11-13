"use client";

import { useId } from "react";

type Props = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
  marker?: boolean;
};

export function FlowArrow({
  x1,
  y1,
  x2,
  y2,
  color = "var(--accent)",
  width = 1.4,
  marker = true,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const markerId = `flow-arrow-${uid}`;

  return (
    <g>
      {marker ? (
        <defs>
          <marker id={markerId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={color} />
          </marker>
        </defs>
      ) : null}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={width}
        strokeDasharray="5 6"
        markerEnd={marker ? `url(#${markerId})` : undefined}
      />
    </g>
  );
}

export function FlowDown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 22" className={className} aria-hidden>
      <FlowArrow x1={12} y1={2} x2={12} y2={18} width={1.3} />
    </svg>
  );
}
