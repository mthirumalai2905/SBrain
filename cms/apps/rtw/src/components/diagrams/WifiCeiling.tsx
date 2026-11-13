"use client";

const limits = [
  { can: "SSID names", cannot: "A floor plan" },
  { can: "Signal strength", cannot: "That a router is old" },
  { can: "A list, right now", cannot: "Who should listen" },
];

export function WifiCeiling() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        The radio sets the ceiling. The service names the job.
      </div>
      <div className="grid gap-px bg-[var(--line)] md:grid-cols-3">
        {limits.map((item) => (
          <div key={item.can} className="bg-[var(--bg)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
              The board can give
            </p>
            <p className="mt-2 text-[16px] text-[var(--ink)]">{item.can}</p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              It cannot give
            </p>
            <p className="mt-2 text-[16px] text-[var(--ink)]">{item.cannot}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
