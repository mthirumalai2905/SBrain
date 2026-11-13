const rows = [
  { www: "Links documents", rtw: "Links real-time data flows" },
  { www: "Stateless request-response", rtw: "Stateful, bidirectional sessions" },
  { www: "Information retrieval", rtw: "Live machine coordination" },
  { www: "Centralized servers", rtw: "Distributed intelligent services" },
  { www: "Human-centric", rtw: "Machine + AI-centric" },
  { www: "Historical data", rtw: "Data from the source" },
];

export function TwinTracks() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="border-b border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Traditional WWW vs Real Time Web (RTW)
      </div>
      <div className="grid grid-cols-2 gap-px bg-[var(--line)]">
        <div className="bg-[var(--bg)] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
          Traditional WWW
        </div>
        <div className="bg-[var(--bg)] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
          Real Time Web (RTW)
        </div>
        {rows.map((row) => (
          <div key={row.www} className="contents">
            <div className="bg-[var(--bg)] px-4 py-3 text-[14px] leading-6 text-[var(--muted)]">{row.www}</div>
            <div className="bg-[var(--bg)] px-4 py-3 text-[14px] leading-6 text-[var(--ink)]">{row.rtw}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
