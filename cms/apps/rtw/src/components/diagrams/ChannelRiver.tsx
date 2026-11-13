export function ChannelRiver() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Live value follows the owner, not the server rack
      </div>
      <svg
        viewBox="0 0 720 220"
        className="h-auto w-full"
        role="img"
        aria-label="A live source flows into a personal channel, then to three objects."
      >
        <rect width="720" height="220" fill="var(--bg)" />
        <path
          d="M70 110 C 180 40, 260 180, 360 110 S 520 40, 650 110"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeOpacity="0.7"
        />

        <circle cx="70" cy="110" r="16" fill="var(--accent-dim)" stroke="var(--accent)" />
        <text x="70" y="158" textAnchor="middle" fill="var(--ink)" fontSize="12">
          Source
        </text>

        <rect x="318" y="88" width="84" height="44" fill="var(--bg-elev)" stroke="var(--accent)" />
        <text x="360" y="108" textAnchor="middle" fill="var(--ink)" fontSize="11">
          Channel
        </text>
        <text x="360" y="124" textAnchor="middle" fill="var(--muted)" fontSize="10">
          same owner
        </text>

        <circle cx="520" cy="72" r="12" fill="var(--bg-elev)" stroke="var(--ink)" />
        <text x="520" y="48" textAnchor="middle" fill="var(--muted)" fontSize="11">
          Fridge
        </text>

        <circle cx="590" cy="148" r="12" fill="var(--bg-elev)" stroke="var(--ink)" />
        <text x="590" y="178" textAnchor="middle" fill="var(--muted)" fontSize="11">
          Lamp
        </text>

        <circle cx="650" cy="110" r="12" fill="var(--bg-elev)" stroke="var(--ink)" />
        <text x="650" y="158" textAnchor="middle" fill="var(--muted)" fontSize="11">
          Agent
        </text>
      </svg>
    </div>
  );
}
