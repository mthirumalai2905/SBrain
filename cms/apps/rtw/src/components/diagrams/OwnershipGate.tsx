export function OwnershipGate() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Data is consumed when ownership or approved read access is present
      </div>
      <div className="grid gap-px bg-[var(--line)] md:grid-cols-2">
        <div className="bg-[var(--bg)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">Flows</p>
          <p className="mt-3 text-[15px] text-[var(--ink)]">Same owner, two endpoints</p>
          <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
            You own the lamp ghost. You also own the ghost that represents you inside the
            scheduler. The ends match. Live data can be consumed.
          </p>
          <p className="mt-3 text-[13px] leading-6 text-[var(--muted)]">
            Or you morph the lamp ghost against the scheduler. That is read access, and you can
            take it back.
          </p>
        </div>
        <div className="bg-[var(--bg)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Does not flow</p>
          <p className="mt-3 text-[15px] text-[var(--ink)]">No match, no morph</p>
          <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
            A neighbor’s lamp is not yours. Sharing an implementation does not open the data.
            Without ownership or an approved morph, nothing is consumed at the endpoint.
          </p>
        </div>
      </div>
    </div>
  );
}
