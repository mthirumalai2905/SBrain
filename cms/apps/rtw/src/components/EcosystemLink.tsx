import Link from "next/link";

type Props = {
  to: "introduction" | "architecture" | "specification" | "implementation";
  children?: React.ReactNode;
};

import { arr, notes } from "@/lib/notes";

export function EcosystemLink({ to, children }: Props) {
  const item = arr(notes.ecosystemLinks).find((x) => x.to === to) ?? { kicker: "", title: "", url: "/docs", label: "" };
  const inner = (
    <>
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
        {item.kicker}
      </div>
      <span className="mt-1 block text-[14px] text-[var(--ink)]">{children ?? item.title}</span>
      <div className="mt-2 text-[13px] text-[var(--accent)]">{item.label} →</div>
    </>
  );

  return (
    <Link
      href={item.url}
      className="mt-8 block border border-[var(--line)] px-4 py-3 transition-colors hover:border-[rgba(127,211,195,0.35)]"
    >
      {inner}
    </Link>
  );
}
