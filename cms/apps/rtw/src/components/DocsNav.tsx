"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { canonicalDocsPath, docsLink, nav } from "@/lib/navigation";
import { clsx } from "clsx";

export function DocsNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <nav className="space-y-1">
      {nav.map((group) => {
        const expanded = open[group.title] ?? true;
        const showGroup = nav.length > 1;
        return (
          <div key={group.title}>
            {showGroup ? (
            <button
              type="button"
              onClick={() =>
                setOpen((current) => ({
                  ...current,
                  [group.title]: !(current[group.title] ?? true),
                }))
              }
              className="flex w-full items-center justify-between px-2 py-2 text-left"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                {group.title}
              </span>
              <span className="font-mono text-[10px] text-[var(--muted)]">{expanded ? "–" : "+"}</span>
            </button>
            ) : null}
            {expanded ? (
              <ul className="mb-3 space-y-0.5">
                {group.items.map((item, index) => {
                  const active = canonicalDocsPath(pathname) === item.href;
                  const chapter = item.chapter;
                  const showChapter = Boolean(chapter && chapter !== group.items[index - 1]?.chapter);
                  return (
                    <li key={item.href}>
                      {showChapter ? (
                        <p
                          className={clsx(
                            "px-2 pb-1 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-[var(--accent)]",
                            index === 0 ? "mt-0.5" : "mt-3.5",
                          )}
                        >
                          {chapter}
                        </p>
                      ) : null}
                      <Link
                        href={docsLink(item.href, pathname)}
                        className={clsx(
                          "flex items-center justify-between gap-2 rounded-sm py-[5px] text-[13px] leading-snug",
                          item.nested ? "pl-5 pr-2" : "px-2",
                          active
                            ? "bg-[var(--accent-dim)] text-[var(--ink)]"
                            : "text-[var(--muted)] hover:text-[var(--ink)]",
                        )}
                      >
                        <span>{item.title}</span>
                        {item.status === "draft" ? (
                          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--warn)]">
                            draft
                          </span>
                        ) : null}
                        {item.status === "pending" ? (
                          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
                            soon
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
