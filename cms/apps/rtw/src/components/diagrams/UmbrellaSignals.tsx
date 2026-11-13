"use client";

const signals = [
  { label: "Rain", meaning: "Bring it with you", tone: "Blue" },
  { label: "Lightning", meaning: "Storm nearby", tone: "White" },
  { label: "Date nearby", meaning: "A person matches close by", tone: "Red" },
];

export function UmbrellaSignals() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        One object. The service chooses what a colour means.
      </div>
      <div className="grid gap-px bg-[var(--line)] md:grid-cols-3">
        {signals.map((signal) => (
          <div key={signal.label} className="bg-[var(--bg)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
              {signal.tone}
            </p>
            <p className="mt-2 text-[16px] text-[var(--ink)]">{signal.label}</p>
            <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">{signal.meaning}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
