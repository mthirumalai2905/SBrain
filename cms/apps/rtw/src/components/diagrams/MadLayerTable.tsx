const layers = [
  {
    code: "L1",
    name: "Infrastructure",
    who: "Hosting, hardware, connectivity",
    does: "Processing, links, energy, storage where required",
    like: "The roads",
  },
  {
    code: "L2",
    name: "Network and security",
    who: "Whoever runs addressing and trust",
    does: "Identity, authentication, authorization, secure communication",
    like: "The checkpoint",
  },
  {
    code: "L3",
    name: "Domain and application",
    who: "Service developer",
    does: "Services, linking, transformation logic",
    like: "The shop",
  },
  {
    code: "L4",
    name: "Resource and ownership",
    who: "The person, machine, or device that owns the resource",
    does: "Whether the data may be accessed or shared",
    like: "The goods, and who may use them",
  },
];

export function MadLayerTable() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Four layers. Four possible owners.
      </div>
      <div className="hidden md:block">
        <div className="grid grid-cols-[72px_1.1fr_1.2fr_1.3fr_0.9fr] border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
          <span />
          <span>Layer</span>
          <span>Who</span>
          <span>What it does</span>
          <span>Teaching picture</span>
        </div>
        {layers.map((layer) => (
          <div
            key={layer.code}
            className="grid grid-cols-[72px_1.1fr_1.2fr_1.3fr_0.9fr] border-t border-[var(--line)] px-4 py-3 text-[13px] leading-6"
          >
            <span className="font-mono text-[10px] text-[var(--accent)]">{layer.code}</span>
            <span className="text-[var(--ink)]">{layer.name}</span>
            <span className="text-[var(--muted)]">{layer.who}</span>
            <span className="text-[var(--muted)]">{layer.does}</span>
            <span className="text-[var(--ink)]">{layer.like}</span>
          </div>
        ))}
      </div>
      <div className="md:hidden">
        {layers.map((layer) => (
          <div key={layer.code} className="border-t border-[var(--line)] px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--accent)]">
              {layer.code} · {layer.name}
            </p>
            <p className="mt-2 text-[13px] leading-6 text-[var(--ink)]">{layer.who}</p>
            <p className="mt-1 text-[13px] leading-6 text-[var(--muted)]">{layer.does}</p>
            <p className="mt-1 text-[13px] leading-6 text-[var(--muted)]">{layer.like}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
