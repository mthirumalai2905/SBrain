const objects = [
  { label: "Lamp", angle: -90 },
  { label: "Drone", angle: -18 },
  { label: "Fridge", angle: 54 },
  { label: "Robot", angle: 126 },
  { label: "Umbrella", angle: 198 },
];

export function WakeRing() {
  const cx = 360;
  const cy = 150;
  const r = 96;

  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        One owner. One channel. Many objects.
      </div>
      <svg
        viewBox="0 0 720 300"
        className="h-auto w-full"
        role="img"
        aria-label="Everyday objects sit on a ring around one personal data channel."
      >
        <rect width="720" height="300" fill="var(--bg)" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--accent)" strokeOpacity="0.35" />
        <circle cx={cx} cy={cy} r="34" fill="var(--accent-dim)" stroke="var(--accent)" />
        <text x={cx} y={cy - 2} textAnchor="middle" fill="var(--ink)" fontSize="12">
          Your
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--ink)" fontSize="12">
          channel
        </text>

        {objects.map((item) => {
          const rad = (item.angle * Math.PI) / 180;
          const x = cx + Math.cos(rad) * r;
          const y = cy + Math.sin(rad) * r;
          const lx = cx + Math.cos(rad) * 138;
          const ly = cy + Math.sin(rad) * 138;
          return (
            <g key={item.label}>
              <line
                x1={cx + Math.cos(rad) * 34}
                y1={cy + Math.sin(rad) * 34}
                x2={x}
                y2={y}
                stroke="var(--accent)"
                strokeOpacity="0.45"
              />
              <circle cx={x} cy={y} r="9" fill="var(--bg-elev)" stroke="var(--ink)" />
              <text
                x={lx}
                y={ly + 4}
                textAnchor="middle"
                fill="var(--muted)"
                fontSize="11"
                fontFamily="var(--font-mono)"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
