"use client";

const stored = [
  "Specify",
  "Code",
  "Test",
  "Deploy",
  "Maintain",
  "Migrate",
];

const live = [
  "Need",
  "Simulate",
  "Assemble",
  "Serve",
  "Dissolve",
  "Learn",
];

export function CodeVsEmergence() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        The ritual versus the regeneration
      </div>
      <div className="grid gap-px bg-[var(--line)] md:grid-cols-2">
        <div className="bg-[var(--bg)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Stored software
          </p>
          <p className="mt-2 text-[15px] text-[var(--ink)]">Keep the system running</p>
          <ol className="mt-5 space-y-2">
            {stored.map((step, index) => (
              <li key={step} className="flex items-center gap-3 text-[13px] text-[var(--ink)]">
                <span className="w-6 font-mono text-[11px] text-[var(--muted)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="h-px flex-1 bg-[var(--line)]" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-[12px] leading-5 text-[var(--muted)]">
            Code stays on disk. Infrastructure stays on the bill.
          </p>
        </div>
        <div className="bg-[var(--bg-elev)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
            Emergent system
          </p>
          <p className="mt-2 text-[15px] text-[var(--ink)]">Build it only while it is needed</p>
          <ol className="mt-5 space-y-2">
            {live.map((step, index) => (
              <li key={step} className="flex items-center gap-3 text-[13px] text-[var(--ink)]">
                <span className="w-6 font-mono text-[11px] text-[var(--accent)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="h-px flex-1 bg-[var(--line)]" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-[12px] leading-5 text-[var(--muted)]">
            If it is needed again, it is generated again.
          </p>
        </div>
      </div>
    </div>
  );
}
