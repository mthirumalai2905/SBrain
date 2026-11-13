import Link from "next/link";
import { canonicalDocsPath, docsLink, getAdjacentDocs } from "@/lib/navigation";

export function DocPager({ pathname }: { pathname: string }) {
  const { prev, next } = getAdjacentDocs(canonicalDocsPath(pathname));
  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Reading path"
      className="mt-14 grid gap-3 border-t border-[var(--line)] pt-6 sm:grid-cols-2"
    >
      {prev ? (
        <Link
          href={docsLink(prev.href, pathname)}
          className="border border-[var(--line)] bg-[var(--bg)] px-4 py-3 shadow-[var(--elev)] transition-colors hover:border-[var(--accent)]"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Previous
          </p>
          <p className="mt-1 text-[14px] text-[var(--ink)]">{prev.title}</p>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={docsLink(next.href, pathname)}
          className="border border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-right shadow-[var(--elev)] transition-colors hover:border-[var(--accent)]"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
            Next
          </p>
          <p className="mt-1 text-[14px] text-[var(--ink)]">{next.title}</p>
        </Link>
      ) : null}
    </nav>
  );
}
