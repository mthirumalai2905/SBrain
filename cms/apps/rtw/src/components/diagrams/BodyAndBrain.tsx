"use client";

export function BodyAndBrain() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        The object stays a body. The service supplies a mind.
      </div>
      <div className="grid gap-px bg-[var(--line)] md:grid-cols-2">
        <div className="bg-[var(--bg)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Physical world
          </p>
          <p className="mt-2 text-[16px] text-[var(--ink)]">Fridge, bicycle, board, bowl</p>
          <p className="mt-4 text-[14px] leading-6 text-[var(--muted)]">
            An endpoint. It can sense and act only as far as its own body allows. It is
            not a person, and it is not the ghost.
          </p>
        </div>
        <div className="bg-[var(--bg-elev)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
            On the network
          </p>
          <p className="mt-2 text-[16px] text-[var(--ink)]">Service, channel, AI agent</p>
          <p className="mt-4 text-[14px] leading-6 text-[var(--muted)]">
            Intelligence is defined here. Change the linking and the same body inherits
            a different job. Withdraw the morph and that mind goes dark.
          </p>
        </div>
      </div>
    </div>
  );
}
