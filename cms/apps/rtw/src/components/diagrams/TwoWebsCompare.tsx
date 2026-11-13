export function TwoWebsCompare() {
  const rows = [
    { label: "Connects", www: "Documents, images, published pages", rtw: "Live resources: sensors, apps, agents, devices" },
    { label: "Link", www: "One-way hyperlink", rtw: "Bidirectional and bijective" },
    { label: "Model", www: "You request. The server answers.", rtw: "Stay connected. Updates arrive as they happen." },
    { label: "Data", www: "Retrieved, and often copied into a platform", rtw: "Stays with the source, then morphed into local models" },
    { label: "Integration", www: "A custom API for each pairing", rtw: "A link between services" },
    { label: "Identity", www: "Each application builds its own login", rtw: "Authentication is optional in MAD" },
    { label: "Sessions", www: "Each application builds its own session and integration", rtw: "A network relationship can persist across participating services" },
    { label: "Control", www: "Application providers commonly control both data and processing", rtw: "Data access and transformation logic can be controlled separately" },
  ];

  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="grid border-b border-[var(--line)] md:grid-cols-2">
        <div className="border-b border-[var(--line)] p-5 md:border-b-0 md:border-r">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">World Wide Web</p>
          <p className="mt-3 text-[15px] leading-7 text-[var(--ink)]">Built for documents you retrieve.</p>
        </div>
        <div className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">Real Time Web</p>
          <p className="mt-3 text-[15px] leading-7 text-[var(--ink)]">Built for live things that stay connected.</p>
        </div>
      </div>
      <div className="hidden md:grid md:grid-cols-[140px_1fr_1fr]">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <div className="border-t border-[var(--line)] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              {row.label}
            </div>
            <div className="border-t border-l border-[var(--line)] px-4 py-3 text-[13px] leading-6 text-[var(--muted)]">
              {row.www}
            </div>
            <div className="border-t border-l border-[var(--line)] px-4 py-3 text-[13px] leading-6 text-[var(--ink)]">
              {row.rtw}
            </div>
          </div>
        ))}
      </div>
      <div className="md:hidden">
        {rows.map((row) => (
          <div key={row.label} className="border-t border-[var(--line)] px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--accent)]">{row.label}</p>
            <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
              WWW: {row.www}
            </p>
            <p className="mt-1 text-[13px] leading-6 text-[var(--ink)]">
              RTW: {row.rtw}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
