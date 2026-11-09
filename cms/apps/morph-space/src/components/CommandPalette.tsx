import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

export type PaletteItem = { group: string; label: string; hint?: string; href?: string };

/** Ctrl/⌘ K menu for jumping around the site. Also opens on the "open-palette" window event. */
export default function CommandPalette({ items }: { items: PaletteItem[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((i) => `${i.label} ${i.hint ?? ""}`.toLowerCase().includes(s)) : items;
  }, [q, items]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setIdx(0);
    document.documentElement.classList.add("no-scroll");
    const id = setTimeout(() => input.current?.focus(), 20);
    return () => {
      clearTimeout(id);
      document.documentElement.classList.remove("no-scroll");
    };
  }, [open]);

  const run = async (item: PaletteItem) => {
    setOpen(false);
    if (!item.href) return;
    if (item.href === "#top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (item.href.startsWith("#")) {
      const el = document.querySelector(item.href);
      el?.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", item.href);
    } else {
      window.location.href = item.href;
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const n = Math.max(1, results.length);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => (i + 1) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => (i - 1 + n) % n);
    } else if (e.key === "Enter" && results[idx]) {
      e.preventDefault();
      run(results[idx]);
    }
  };

  return (
    <>
      {open && (
        <div className="cmdk-overlay" onMouseDown={() => setOpen(false)}>
          <div
            className="cmdk"
            role="dialog"
            aria-modal="true"
            aria-label="Jump to"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="cmdk-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                ref={input}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setIdx(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Where do you want to go?"
                aria-label="Search pages, sections and actions"
              />
              <kbd>Esc</kbd>
            </div>
            <ul className="cmdk-list" role="listbox">
              {results.length === 0 && <li className="cmdk-empty">Nothing matches “{q}”.</li>}
              {results.map((item, i) => (
                <li key={item.label} role="none">
                  {(i === 0 || results[i - 1].group !== item.group) && <p className="cmdk-group">{item.group}</p>}
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === idx}
                    className={`cmdk-item ${i === idx ? "on" : ""}`}
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => run(item)}
                  >
                    <span>{item.label}</span>
                    {item.hint && <em>{item.hint}</em>}
                    <span className="cmdk-enter" aria-hidden>↵</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="cmdk-foot">
              <span><kbd>↑</kbd> <kbd>↓</kbd> to move</span>
              <span><kbd>↵</kbd> to open</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
