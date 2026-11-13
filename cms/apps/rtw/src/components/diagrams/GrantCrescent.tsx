export function GrantCrescent() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Read access is a crescent. The owner can take it back.
      </div>
      <svg viewBox="0 0 720 230" className="h-auto w-full" role="img" aria-label="A lamp granting a withdrawable crescent of read access to a dusk scheduler.">
        <rect width="720" height="230" fill="var(--bg)" />
        <circle cx="150" cy="110" r="34" fill="var(--node)" stroke="var(--accent)" />
        <text x="150" y="106" textAnchor="middle" fill="var(--ink)" fontSize="11">
          Lamp
        </text>
        <text x="150" y="122" textAnchor="middle" fill="var(--muted)" fontSize="10">
          stays home
        </text>

        <path
          d="M210 110 A170 80 0 0 1 510 110"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeDasharray="6 8"
        />
        <text x="360" y="72" textAnchor="middle" fill="var(--accent)" fontSize="11">
          morph: read, then reshape
        </text>
        <text x="360" y="160" textAnchor="middle" fill="var(--muted)" fontSize="11">
          withdraw, and the arc goes dark
        </text>

        <circle cx="570" cy="110" r="34" fill="var(--accent-dim)" stroke="var(--accent)" />
        <text x="570" y="106" textAnchor="middle" fill="var(--ink)" fontSize="11">
          Scheduler
        </text>
        <text x="570" y="122" textAnchor="middle" fill="var(--muted)" fontSize="10">
          local shape
        </text>
      </svg>
    </div>
  );
}
