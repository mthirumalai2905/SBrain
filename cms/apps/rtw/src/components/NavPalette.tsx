"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { clsx } from "clsx";
import { canonicalDocsPath, docsLink, nav } from "@/lib/navigation";

type PaletteContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function useNavPalette() {
  const value = useContext(PaletteContext);
  if (!value) throw new Error("useNavPalette must be used within NavPaletteProvider");
  return value;
}

const pages = [
  { title: "About RTW", href: "/docs", trail: "Site" },
  { title: "What is Real Time Web?", href: "/docs/introduction", trail: "Concept" },
  { title: "Why Real Time Web?", href: "/docs/introduction/why", trail: "Concept" },
  { title: "The Internet of tomorrow", href: "/docs/introduction/tomorrow", trail: "Concept" },
  { title: "The last IT project", href: "/blog/the-last-it-project", trail: "Journals" },
  { title: "Two webs", href: "/blog/two-webs", trail: "Journals" },
  { title: "Twenty-four hours at NTNU", href: "/blog/twenty-four-hours-at-ntnu", trail: "Journals" },
  { title: "Autonomous machine networks", href: "/blog/autonomous-machine-networks", trail: "Journals" },
  { title: "Internet for machines", href: "/blog/internet-for-machines", trail: "Journals" },
  { title: "Data and information", href: "/docs/introduction/data-and-information", trail: "Concept" },
  { title: "What it can do", href: "/docs/introduction/what-it-can-do", trail: "Concept" },
  { title: "How it works", href: "/docs/introduction/how-it-works", trail: "Concept" },
  { title: "Morphic Architecture", href: "/docs/architecture", trail: "MAD Architecture" },
  { title: "Morphic services", href: "/docs/architecture/morphic-services", trail: "MAD Architecture" },
  { title: "Bijective network", href: "/docs/architecture/bijective-network", trail: "Network Topology" },
  { title: "How participation works", href: "/docs/introduction/onboarding", trail: "Concept" },
  { title: "Journals", href: "/blog", trail: "Site" },
  { title: "Under the hood", href: "/hood/implementation/blueprint", trail: "Site" },
  { title: "Blueprint", href: "/hood/implementation/blueprint", trail: "Network Topology" },
  { title: "Contact", href: "/contact", trail: "Site" },
  { title: "Summary", href: "/docs/summary", trail: "History" },
  { title: "Dictionary", href: "/hood/implementation/dictionary", trail: "Specifications" },
];

export function NavPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <PaletteContext.Provider value={{ open, setOpen }}>
      {children}
      <NavPalette />
    </PaletteContext.Provider>
  );
}

function NavPalette() {
  const { open, setOpen } = useNavPalette();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focus = window.setTimeout(() => inputRef.current?.focus(), 20);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.clearTimeout(focus);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const q = query.trim().toLowerCase();

  const pageHits = useMemo(
    () =>
      pages.filter(
        (page) =>
          !q ||
          page.title.toLowerCase().includes(q) ||
          page.trail.toLowerCase().includes(q),
      ),
    [q],
  );

  const docGroups = useMemo(
    () =>
      nav
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              !q ||
              item.title.toLowerCase().includes(q) ||
              group.title.toLowerCase().includes(q),
          ),
        }))
        .filter((group) => group.items.length > 0),
    [q],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        className="absolute inset-0 bg-[color-mix(in_srgb,black_55%,transparent)]"
        aria-label="Close navigation"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
        className="absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] mx-auto flex max-h-[min(78dvh,calc(100dvh-1.5rem))] w-auto max-w-[560px] flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg-elev)] shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:inset-x-auto sm:left-1/2 sm:top-[10vh] sm:w-[560px] sm:-translate-x-1/2 sm:max-h-[78vh]"
      >
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-4">
          <Search size={16} className="shrink-0 text-[var(--muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search docs, pages, and sections"
            className="h-12 w-full bg-transparent text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
          />
          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center text-[var(--muted)] hover:text-[var(--ink)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="nav-scroll min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {pageHits.length === 0 && docGroups.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-[var(--muted)]">No matching pages.</p>
          ) : null}

          {pageHits.length > 0 ? (
            <section className="mb-3">
              <div className="px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                Pages
              </div>
              {pageHits.map((page) => {
                const className = clsx(
                  "flex items-center justify-between gap-3 px-3 py-2.5 text-[14px]",
                  pathname === page.href
                    ? "bg-[var(--accent-dim)] text-[var(--ink)]"
                    : "text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]",
                );
                const label = (
                  <>
                    <span>{page.title}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      {page.trail}
                    </span>
                  </>
                );
                if (page.href.startsWith("http")) {
                  return (
                    <a key={page.href} href={page.href} rel="noreferrer" className={className}>
                      {label}
                    </a>
                  );
                }
                return (
                  <Link key={page.href} href={page.href} className={className}>
                    {label}
                  </Link>
                );
              })}
            </section>
          ) : null}

          {docGroups.map((group) => (
            <section key={group.title} className="mb-3">
              <div className="px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                {group.title}
              </div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={docsLink(item.href, pathname)}
                  className={clsx(
                    "flex items-center justify-between gap-3 px-3 py-2.5 text-[14px]",
                    pathname === item.href
                      ? "bg-[var(--accent-dim)] text-[var(--ink)]"
                      : "text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]",
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
              ))}
            </section>
          ))}
        </div>

        <div className="hidden items-center gap-4 border-t border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] sm:flex">
          <span>Select ↑ ↓</span>
          <span>Esc close</span>
          <span className="ml-auto">Ctrl K</span>
        </div>
      </div>
    </div>
  );
}

export function DocsBrowseBar() {
  const { setOpen } = useNavPalette();
  const pathname = usePathname();
  const current =
    nav.flatMap((group) => group.items.map((item) => ({ ...item, group: group.title }))).find((item) => item.href === canonicalDocsPath(pathname)) ??
    null;

  return (
    <div className="sticky top-14 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] px-4 py-2.5 backdrop-blur-md md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 border border-[var(--line)] bg-[var(--bg-elev)] px-3 py-2.5 text-left"
      >
        <Search size={15} className="text-[var(--muted)]" />
        <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--muted)]">
          {current ? `${current.chapter ?? current.group} / ${current.title}` : "Browse documentation"}
        </span>
        <span className="font-mono text-[10px] tracking-wider text-[var(--muted)]">Menu</span>
      </button>
    </div>
  );
}
