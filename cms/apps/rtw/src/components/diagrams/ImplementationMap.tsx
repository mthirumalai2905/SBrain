import Link from "next/link";

const items = [
  {
    href: "/docs/implementation/synx",
    kicker: "Known tools",
    name: "Synx",
    role: "Tools to configure, administer, secure, and maintain RTW services.",
  },
  {
    href: "/docs/implementation/morph",
    kicker: "Known network",
    name: "Morph Space",
    role: "A marketplace and environment for domains, resources, and participation.",
  },
  {
    href: "/docs/implementation/skalle",
    kicker: "Planning",
    name: "Skalle",
    role: "A party planning an implementation. Product detail is not in the public source yet.",
  },
];

export function ImplementationMap() {
  return (
    <div className="diagram-block my-8 overflow-hidden border border-[var(--line)]">
      <div className="grid gap-px bg-[var(--line)] md:grid-cols-3">
        {items.map((item) => (
          <Link key={item.name} href={item.href} className="bg-[var(--bg)] p-5 hover:bg-[var(--bg-elev)]">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
              {item.kicker}
            </div>
            <div className="mt-2 text-[1.05rem] text-[var(--ink)]">{item.name}</div>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--muted)]">{item.role}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
