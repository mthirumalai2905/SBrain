export function MessageExample() {
  const rows = [
    { layer: "Infrastructure", who: "Hardware / connectivity provider", act: "Operate devices and transport the message" },
    { layer: "Network / security", who: "Network operator", act: "Identify, authenticate, and protect the communication" },
    { layer: "Domain / application", who: "Application developer", act: "Construct, process, send, and receive the message" },
    { layer: "Resource / ownership", who: "End user", act: "Create the message and decide to share it" },
  ];

  return (
    <div className="my-8 border border-[var(--line)]">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-[var(--line)] font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-2 font-normal">Layer</th>
              <th className="px-4 py-2 font-normal">Independent participant</th>
              <th className="px-4 py-2 font-normal">Role in a message</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.layer} className="border-b border-[var(--line)] last:border-0">
                <td className="px-4 py-3 text-[var(--accent)]">{row.layer}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{row.who}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{row.act}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden">
        {rows.map((row) => (
          <div key={row.layer} className="border-b border-[var(--line)] px-4 py-3 last:border-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--accent)]">{row.layer}</p>
            <p className="mt-1 text-[13px] leading-6 text-[var(--ink)]">{row.who}</p>
            <p className="mt-1 text-[13px] leading-6 text-[var(--muted)]">{row.act}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
