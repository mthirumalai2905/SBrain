"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Heading = { id: string; text: string; level: number };

export function OnThisPage() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll(".prose-rtw h2, .prose-rtw h3"),
    ) as HTMLHeadingElement[];
    setHeadings(
      nodes.map((node) => ({
        id: node.id,
        text: node.textContent ?? "",
        level: node.tagName === "H3" ? 3 : 2,
      })),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [pathname]);

  if (headings.length === 0) return null;

  return (
    <div>
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        On this page
      </div>
      <ul className="space-y-1.5 border-l border-[var(--line)]">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={
                "block py-0.5 text-[12px] " +
                (heading.level === 3 ? "pl-5" : "pl-3") +
                " " +
                (active === heading.id ? "text-[var(--accent)]" : "text-[var(--muted)]")
              }
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
