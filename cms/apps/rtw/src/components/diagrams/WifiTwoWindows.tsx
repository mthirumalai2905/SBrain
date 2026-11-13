"use client";

export function WifiTwoWindows() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        The same blink. Two presents.
      </div>
      <div className="grid gap-px bg-[var(--line)] md:grid-cols-2">
        <div className="bg-[var(--bg)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            On the bench
          </p>
          <p className="mt-2 text-[16px] text-[var(--ink)]">Serial terminal</p>
          <p className="mt-4 text-[14px] leading-6 text-[var(--muted)]">
            Wired to the board. It writes when the blue LED blinks. That is the scan
            happening in the room.
          </p>
        </div>
        <div className="bg-[var(--bg-elev)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
            On the network
          </p>
          <p className="mt-2 text-[16px] text-[var(--ink)]">The Real Time Web window</p>
          <p className="mt-4 text-[14px] leading-6 text-[var(--muted)]">
            The same list, reached over the network. Not emailed. Not refreshed from a
            dump. The present on both sides is the same present.
          </p>
        </div>
      </div>
    </div>
  );
}
