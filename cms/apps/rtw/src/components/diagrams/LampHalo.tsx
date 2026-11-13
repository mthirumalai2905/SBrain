export function LampHalo() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        One lamp. One halo. Only while the link is live.
      </div>
      <svg viewBox="0 0 720 240" className="h-auto w-full" role="img" aria-label="A lamp with a live halo that is its ghost, not a stored twin.">
        <rect width="720" height="240" fill="var(--bg)" />
        <ellipse cx="220" cy="168" rx="36" ry="10" fill="var(--node)" />
        <rect x="208" y="92" width="24" height="76" fill="var(--node)" stroke="var(--line)" />
        <path d="M196 92 Q220 48 244 92" fill="var(--accent-dim)" stroke="var(--accent)" />
        <circle cx="220" cy="78" r="7" fill="var(--accent)" />

        <circle cx="220" cy="110" r="78" fill="none" stroke="var(--accent)" strokeDasharray="3 7" strokeOpacity="0.8" />
        <circle cx="220" cy="110" r="98" fill="none" stroke="var(--accent)" strokeDasharray="1 10" strokeOpacity="0.4" />

        <text x="220" y="214" textAnchor="middle" fill="var(--ink)" fontSize="12">
          Endpoint
        </text>
        <text x="360" y="72" fill="var(--accent)" fontSize="12">
          Ghost
        </text>
        <path d="M300 100 C340 70 400 90 470 118" fill="none" stroke="var(--accent)" />
        <circle cx="500" cy="128" r="46" fill="none" stroke="var(--accent)" />
        <text x="500" y="124" textAnchor="middle" fill="var(--ink)" fontSize="12">
          One pairing
        </text>
        <text x="500" y="142" textAnchor="middle" fill="var(--muted)" fontSize="11">
          Never two lamps
        </text>
        <text x="500" y="214" textAnchor="middle" fill="var(--muted)" fontSize="11">
          Dark when the connection is gone
        </text>
      </svg>
    </div>
  );
}
