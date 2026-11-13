import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative z-40 border-t border-[var(--line)] bg-[var(--bg-elev)]">
      <div className="mx-auto grid max-w-[1600px] gap-8 px-4 py-10 sm:gap-10 sm:py-14 md:grid-cols-4 md:px-6">
        <div className="md:col-span-1">
          <p className="font-mono text-[11px] tracking-[0.18em] text-[var(--accent)]">REAL TIME WEB</p>
          <p className="mt-4 max-w-xs text-[0.8125rem] leading-6 text-[var(--muted)] xl:text-[0.9rem]">
            A standalone nonprofit site. It explains what the Real Time Web is, why it exists, and
            introduces Morphic Architecture Design.
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">About RTW</p>
          <ul className="mt-3 space-y-2 text-[0.8125rem] text-[var(--ink)] xl:text-[0.9rem]">
            <li>
              <Link href="/docs">Overview</Link>
            </li>
            <li>
              <Link href="/docs/introduction">What and why</Link>
            </li>
            <li>
              <Link href="/docs/architecture">Morphic Architecture</Link>
            </li>
            <li>
              <Link href="/docs/architecture/infrastructure">Infrastructure</Link>
            </li>
            <li>
              <Link href="/docs/reference/faq">FAQ</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Also here</p>
          <ul className="mt-3 space-y-2 text-[0.8125rem] text-[var(--ink)] xl:text-[0.9rem]">
            <li>
              <Link href="/blog">Journals</Link>
            </li>
            <li>
              <Link href="/hood/implementation/blueprint">Under the hood</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
            <li>
              <Link href="/docs/introduction/vision">Vision</Link>
            </li>
            <li>
              <Link href="/docs/introduction/tomorrow">The Internet of tomorrow</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">Status</p>
          <ul className="mt-3 space-y-2 text-[0.8125rem] leading-6 text-[var(--muted)] xl:text-[0.9rem]">
            <li>Architecture: public</li>
            <li>Under the hood: how live channels work</li>
            <li>Not owned by a company</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-1.5 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[0.75rem] leading-6 text-[var(--muted)] md:px-6 xl:text-[0.8125rem]">
          <p>Copyright © 2026 Real Time Web org. 836 603 362</p>
        </div>
      </div>
    </footer>
  );
}
