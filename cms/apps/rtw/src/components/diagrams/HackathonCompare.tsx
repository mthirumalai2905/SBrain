"use client";

export function HackathonCompare() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        As the written account of that event describes it
      </div>
      <div className="grid gap-px bg-[var(--line)] md:grid-cols-2">
        <div className="bg-[var(--bg)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Earlier IoT weekend
          </p>
          <p className="mt-2 text-[16px] text-[var(--ink)]">Integration as the work</p>
          <p className="mt-4 text-[14px] leading-6 text-[var(--muted)]">
            Same student group, a few months before. The account says the presentations
            became slides. The services were not live.
          </p>
        </div>
        <div className="bg-[var(--bg-elev)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
            NTNU, 24 hours
          </p>
          <p className="mt-2 text-[16px] text-[var(--ink)]">A live channel already there</p>
          <p className="mt-4 text-[14px] leading-6 text-[var(--muted)]">
            Same student group. The account says they finished proofs and showed them
            on stage while they were still running.
          </p>
        </div>
      </div>
    </div>
  );
}
