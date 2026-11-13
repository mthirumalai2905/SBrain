export function ServiceSchema() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Teaching sketch of a local data model. Not a protocol specification.
      </div>
      <div className="grid gap-px bg-[var(--line)] md:grid-cols-2">
        <div className="bg-[var(--bg)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">Morphic service</p>
          <p className="mt-2 text-[16px] text-[var(--ink)]">Lamp service</p>
          <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
            An application-layer home that allocates ghosts. The service owner starts as primary
            owner of those ghosts.
          </p>
        </div>
        <div className="bg-[var(--bg)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Local model</p>
          <div className="mt-3 space-y-2 font-mono text-[12px] text-[var(--ink)]">
            <div className="flex justify-between border border-[var(--line)] px-3 py-2">
              <span>brightness</span>
              <span className="text-[var(--accent)]">live</span>
            </div>
            <div className="flex justify-between border border-[var(--line)] px-3 py-2">
              <span>is_on</span>
              <span className="text-[var(--accent)]">live</span>
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-5 text-[var(--muted)]">
            The shape lives with the service. Other services morph into their own models. RTW does
            not require one encoding for everyone.
          </p>
        </div>
      </div>
    </div>
  );
}
