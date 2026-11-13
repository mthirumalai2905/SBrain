export function SplitPulse() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Same Internet. Two jobs.
      </div>
      <svg viewBox="0 0 720 220" className="h-auto w-full" role="img" aria-label="A clock that ticks only when asked, beside a ring that stays lit.">
        <rect width="720" height="220" fill="var(--bg)" />
        <line x1="360" y1="24" x2="360" y2="196" stroke="var(--line)" />

        <circle cx="180" cy="108" r="62" fill="none" stroke="var(--line)" strokeWidth="1.5" />
        <circle cx="180" cy="108" r="4" fill="var(--muted)" />
        <line x1="180" y1="108" x2="180" y2="58" stroke="var(--muted)" strokeWidth="2" />
        <polygon points="248,108 268,102 268,114" fill="var(--muted)" />
        <text x="180" y="198" textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="var(--font-mono)">
          WWW: you ask, it answers, it stops
        </text>

        <circle cx="540" cy="108" r="62" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        <circle cx="540" cy="108" r="38" fill="none" stroke="var(--accent)" strokeOpacity="0.45" strokeDasharray="4 6" />
        <circle cx="540" cy="108" r="6" fill="var(--accent)" />
        <circle cx="592" cy="78" r="3" fill="var(--accent)" />
        <circle cx="498" cy="132" r="3" fill="var(--accent)" />
        <text x="540" y="198" textAnchor="middle" fill="var(--accent)" fontSize="11" fontFamily="var(--font-mono)">
          RTW: the relationship stays open
        </text>
      </svg>
    </div>
  );
}
