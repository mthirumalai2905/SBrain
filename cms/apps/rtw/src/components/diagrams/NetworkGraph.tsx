"use client";

import { useMemo } from "react";

type Node = { x: number; y: number; r: number; delay: number };

function seeded(count: number): Node[] {
  const nodes: Node[] = [];
  let s = 7;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = 0; i < count; i++) {
    nodes.push({
      x: 40 + rand() * 920,
      y: 28 + rand() * 200,
      r: 1.4 + rand() * 2.2,
      delay: rand() * 4,
    });
  }
  return nodes;
}

export function NetworkGraph({ className = "" }: { className?: string }) {
  const nodes = useMemo(() => seeded(28), []);
  const links = useMemo(() => {
    const edges: Array<[number, number]> = [];
    nodes.forEach((a, i) => {
      nodes.forEach((b, j) => {
        if (j <= i) return;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < 150) edges.push([i, j]);
      });
    });
    return edges;
  }, [nodes]);

  return (
    <svg
      viewBox="0 0 1000 256"
      className={`diagram-block ${className}`}
      role="img"
      aria-label="Abstract network of connected endpoints"
    >
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1000" height="256" fill="url(#glow)" />
      {links.map(([i, j], n) => (
        <line
          key={n}
          x1={nodes[i].x}
          y1={nodes[i].y}
          x2={nodes[j].x}
          y2={nodes[j].y}
          stroke="rgba(127,211,195,0.22)"
          strokeWidth="0.8"
          strokeDasharray="5 7"
          data-flow="slow"
        />
      ))}
      {nodes.map((node, i) => (
        <circle
          key={i}
          cx={node.x}
          cy={node.y}
          r={node.r}
          fill="var(--accent)"
          style={{ animation: `pulse-node 4.8s ease-in-out ${node.delay}s infinite` }}
        />
      ))}
    </svg>
  );
}
