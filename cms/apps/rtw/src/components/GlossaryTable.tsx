import { glossary } from "@/components/Glossary";
import Link from "next/link";

export function GlossaryTable() {
  return (
    <div className="my-6 border border-[var(--line)] bg-[var(--bg)] shadow-[var(--elev)]">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-[var(--line)] font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-2 font-normal">Term</th>
              <th className="px-4 py-2 font-normal">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {glossary.map((item) => (
              <tr key={item.id} className="border-b border-[var(--line)] last:border-0">
                <td className="px-4 py-3 align-top text-[var(--ink)]">
                  {item.href ? <Link href={item.href}>{item.term}</Link> : item.term}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{item.def}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden">
        {glossary.map((item) => (
          <div key={item.id} className="border-b border-[var(--line)] px-4 py-3 last:border-0">
            <p className="text-[14px] text-[var(--ink)]">
              {item.href ? <Link href={item.href}>{item.term}</Link> : item.term}
            </p>
            <p className="mt-1 text-[13px] leading-6 text-[var(--muted)]">{item.def}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
