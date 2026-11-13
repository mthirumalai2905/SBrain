"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  findIssue,
  isReadable,
  pdfHref,
  seriesOf,
  shelf,
  type Issue,
  type ReadableIssue,
  type Series,
} from "@/content/chronicles-catalog";
import { Leaf, VolumeCover } from "./chronicles-blocks";

type Box = { top: number; left: number; width: number; height: number };

const columnQuery = "(max-width: 720px), (max-height: 520px)";

function measureReader(focused: boolean): Box {
  const column = window.matchMedia(columnQuery).matches;
  const nav = document.querySelector(".lab-nav");
  const chrome = focused || column ? 12 : Math.round((nav?.getBoundingClientRect().height ?? 56) + 12);
  const side = column ? 10 : focused ? 40 : 28;
  const width = Math.min(window.innerWidth >= 1800 ? 1480 : 1120, window.innerWidth - side * 2);
  const available = window.innerHeight - chrome - (focused || column ? 12 : 16);
  const ratio = window.innerWidth >= 860 ? 0.68 : 1.2;
  const height = column ? available : Math.max(320, Math.min(available, Math.round(width * ratio)));
  const left = Math.round((window.innerWidth - width) / 2);
  const top = focused || column
    ? Math.max(12, Math.round((window.innerHeight - height) / 2))
    : chrome + Math.max(0, Math.round((available - height) / 2));
  return { top, left, width, height };
}

function readable(series: Series) {
  return series.issues.filter(isReadable);
}

export function Chronicles({ className = "", initialSlug, head }: { className?: string; initialSlug?: string; head?: { kicker?: string; title?: string; lede?: string } }) {
  const reduce = useReducedMotion();
  const leadRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const started = useRef(false);
  const swipe = useRef({ x: 0, y: 0 });
  const api = useRef({
    closeBook: () => {},
    focus: (_value: boolean) => {},
    go: (_next: number) => {},
    spread: 0,
    showPages: false,
    focused: false,
  });
  const [open, setOpen] = useState(false);
  const [grown, setGrown] = useState(false);
  const [showPages, setShowPages] = useState(false);
  const [focused, setFocused] = useState(false);
  const [origin, setOrigin] = useState<Box | null>(null);
  const [target, setTarget] = useState<Box | null>(null);
  const [spread, setSpread] = useState(0);
  const [turn, setTurn] = useState<{ from: number; to: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [column, setColumn] = useState(false);
  const [readingPage, setReadingPage] = useState(1);
  const [lead, setLead] = useState<ReadableIssue>(() => findIssue(initialSlug ?? "") ?? readable(shelf[0])[0]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pages = lead.pages;
  const spreadCount = Math.max(1, Math.ceil(pages.length / 2));
  const leadSeries = seriesOf(lead);

  useEffect(() => {
    const media = window.matchMedia(columnQuery);
    const sync = () => setColumn(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  function onColumnScroll() {
    const box = scrollRef.current;
    if (!box) return;
    const line = box.getBoundingClientRect().top + box.clientHeight * 0.35;
    const leaves = box.querySelectorAll<HTMLElement>(".ink-leaf");
    let current = 1;
    leaves.forEach((leaf, index) => {
      if (leaf.getBoundingClientRect().top <= line) current = index + 1;
    });
    setReadingPage(current);
  }

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const y = window.scrollY;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      scrollBehavior: html.style.scrollBehavior,
    };
    html.style.overflow = "hidden";
    html.style.scrollBehavior = "auto";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    dialogRef.current?.focus();

    const onWheel = (event: WheelEvent) => {
      let node = event.target instanceof Element ? event.target : null;
      while (node && node !== dialogRef.current) {
        if (node instanceof HTMLElement && node.scrollHeight > node.clientHeight + 1) {
          const overflow = getComputedStyle(node).overflowY;
          if (overflow === "auto" || overflow === "scroll") {
            const max = node.scrollHeight - node.clientHeight;
            const canMove = event.deltaY < 0 ? node.scrollTop > 0 : node.scrollTop < max - 1;
            if (canMove) return;
          }
        }
        node = node.parentElement;
      }
      event.preventDefault();
    };
    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheel);
      html.style.overflow = prev.htmlOverflow;
      html.style.scrollBehavior = prev.scrollBehavior;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, y);
    };
  }, [open]);

  useEffect(() => {
    if (!open || reduce || grown) return;
    let alive = true;
    const frame = window.requestAnimationFrame(() => {
      if (alive) setGrown(true);
    });
    const backup = window.setTimeout(() => {
      if (alive) setGrown(true);
    }, 60);
    return () => {
      alive = false;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(backup);
    };
  }, [open, reduce, grown]);

  useEffect(() => {
    if (!open || !grown || reduce) return;
    const id = window.setTimeout(() => setShowPages(true), 520);
    return () => window.clearTimeout(id);
  }, [open, grown, reduce]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => setTarget(measureReader(focused));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, focused]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (api.current.focused) api.current.focus(false);
        else api.current.closeBook();
        return;
      }
      if (!api.current.showPages) return;
      if (event.key === "ArrowRight") api.current.go(api.current.spread + 1);
      if (event.key === "ArrowLeft") api.current.go(api.current.spread - 1);
      if (event.key === "f" || event.key === "F") api.current.focus(!api.current.focused);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!picking) return;
    pickerRef.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
    const id = picking;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPicking(null);
      document.querySelector<HTMLButtonElement>(`[data-series="${id}"]`)?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      const li = pickerRef.current?.parentElement;
      if (li && event.target instanceof Node && !li.contains(event.target)) setPicking(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [picking]);

  useEffect(() => {
    if (showPages) closeRef.current?.focus();
  }, [showPages]);

  useEffect(() => {
    if (!turn) return;
    const id = window.setTimeout(() => {
      setSpread(turn.to);
      setTurn(null);
    }, 780);
    return () => window.clearTimeout(id);
  }, [turn]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (started.current || !initialSlug) return;
    started.current = true;
    const issue = findIssue(initialSlug);
    const series = issue && seriesOf(issue);
    const button = series && document.querySelector<HTMLButtonElement>(`[data-series="${series.id}"]`);
    if (issue && button) openBook(issue, button);
  });

  function go(next: number) {
    const clamped = Math.max(0, Math.min(spreadCount - 1, next));
    if (clamped === spread || turn) return;
    if (reduce) {
      setSpread(clamped);
      return;
    }
    setTurn({ from: spread, to: clamped });
  }

  function page(index: number, side: "left" | "right") {
    return (
      <Leaf
        blocks={pages[index] ?? null}
        side={side}
        folio={index < pages.length ? String(index + 1).padStart(2, "0") : ""}
      />
    );
  }

  function openBook(issue: ReadableIssue, button: HTMLButtonElement) {
    if (closing.current) return;
    leadRef.current = button;
    setLead(issue);
    setPicking(null);
    setReadingPage(1);
    const rect = button.getBoundingClientRect();
    setOrigin({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    setTarget(measureReader(false));
    setSpread(0);
    setTurn(null);
    setFocused(false);
    setShowPages(false);
    setGrown(false);
    setOpen(true);
    window.history.replaceState(null, "", `/chronicles/${issue.slug}`);
    if (reduce) {
      setGrown(true);
      setShowPages(true);
    }
  }

  function closeBook() {
    if (!open || closing.current) return;
    closing.current = true;
    setTurn(null);
    setShowPages(false);
    window.history.replaceState(null, "", "/chronicles");
    const finish = () => {
      setOpen(false);
      setOrigin(null);
      setSpread(0);
      setFocused(false);
      closing.current = false;
      leadRef.current?.focus();
    };
    if (reduce) {
      setGrown(false);
      finish();
      return;
    }
    window.setTimeout(() => setGrown(false), 140);
    window.setTimeout(finish, 700);
  }

  function focus(value: boolean) {
    setFocused(value);
    setTarget(measureReader(value));
  }

  api.current = { closeBook, focus, go, spread, showPages, focused };

  function soon(id: string) {
    setNote(id);
    window.setTimeout(() => {
      setNote((current) => (current === id ? null : current));
    }, 1700);
  }

  function onSeries(series: Series, event: React.MouseEvent<HTMLButtonElement>) {
    if (series.issues.length > 1) {
      setPicking((current) => (current === series.id ? null : series.id));
      return;
    }
    const issue = series.issues[0];
    if (isReadable(issue)) openBook(issue, event.currentTarget);
    else soon(series.id);
  }

  function pick(series: Series, issue: Issue) {
    const button = document.querySelector<HTMLButtonElement>(`[data-series="${series.id}"]`);
    if (isReadable(issue) && button) openBook(issue, button);
    else soon(issue.id);
  }

  async function share() {
    const url = `${window.location.origin}/chronicles/${lead.slug}`;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    try {
      if (touch && navigator.share) {
        await navigator.share({ title: lead.title, text: lead.description, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast("Link copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      window.prompt("Copy this link", url);
    }
  }

  function onDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const items = dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), [href], [tabindex]:not([tabindex='-1'])");
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const box = (grown && target) || origin;

  return (
    <div className={`ink-library${className ? ` ${className}` : ""}${open ? " is-reading" : ""}${focused ? " is-focus" : ""}`}>
      <header className="ink-mast" aria-hidden={open}>
        <p className="ink-kicker">{head?.kicker}</p>
        <div className="ink-mast-row">
          <h1>{head?.title}</h1>
          <p className="ink-lede">{head?.lede}</p>
        </div>
      </header>

      <ul className="ink-rack" aria-hidden={open}>
        {shelf.map((series) => {
          const [first, ...rest] = series.issues;
          const stack = rest.length > 0;
          const ready = readable(series).length > 0;
          const active = open && leadSeries?.id === series.id;
          return (
            <li key={series.id} className={picking === series.id ? "is-picking" : undefined}>
              <motion.button
                type="button"
                data-series={series.id}
                className={`ink-volume${ready ? " is-lead" : ""}${stack ? " is-stack" : ""}`}
                aria-haspopup={stack ? "listbox" : ready ? "dialog" : undefined}
                aria-expanded={stack ? picking === series.id : ready ? active : undefined}
                aria-label={
                  stack
                    ? `${series.name}, ${series.issues.length} volumes. Choose a volume`
                    : ready
                      ? `Open ${first.title}`
                      : `${series.name} is not inked yet`
                }
                animate={
                  open
                    ? { opacity: 0, y: active ? 0 : 24, scale: active ? 1 : 0.92 }
                    : { opacity: 1, y: 0, scale: 1 }
                }
                transition={{ duration: reduce ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
                onClick={(event) => onSeries(series, event)}
              >
                {rest
                  .slice(0, 2)
                  .reverse()
                  .map((issue, index, list) => (
                    <span
                      key={issue.id}
                      className="ink-stack-sheet"
                      style={{ "--depth": list.length - index } as React.CSSProperties}
                      aria-hidden="true"
                    >
                      <img src={issue.image} alt="" />
                    </span>
                  ))}
                <VolumeCover issue={first} />
                {stack ? <span className="ink-stack-count">{series.issues.length} volumes</span> : null}
                <span className="ink-shadow" aria-hidden="true" />
                {note === series.id ? <span className="ink-pop">Not inked yet</span> : null}
              </motion.button>
              {picking === series.id ? (
                <div ref={pickerRef} className="ink-picker" role="listbox" aria-label={`Volumes of ${series.name}`}>
                  <p className="ink-picker-title">{series.name}</p>
                  {series.issues.map((issue) => {
                    const ok = isReadable(issue);
                    return (
                      <button
                        key={issue.id}
                        type="button"
                        role="option"
                        aria-selected={false}
                        aria-disabled={!ok}
                        className={ok ? "" : "is-press"}
                        onClick={() => pick(series, issue)}
                      >
                        <img src={issue.image} alt="" />
                        <span>
                          <strong>{issue.label}</strong>
                          <em>{ok ? "Read now" : note === issue.id ? "Not inked yet" : "In the press"}</em>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {open && box ? (
        <>
          <button
            type="button"
            className="ink-backdrop"
            aria-label={focused ? "Leave focus" : "Close the book"}
            onClick={() => (focused ? focus(false) : closeBook())}
          />
          <div
            ref={dialogRef}
            className={`ink-reader${reduce ? " is-instant" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={lead.title}
            tabIndex={-1}
            style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
            onKeyDown={onDialogKeyDown}
          >
            <div className={`ink-reader-face${showPages ? " is-gone" : ""}`}>
              <VolumeCover issue={lead} fill />
            </div>
            {showPages ? (
              <div
                className="ink-read"
                onTouchStart={(event) => {
                  if (column) return;
                  swipe.current = {
                    x: event.changedTouches[0].clientX,
                    y: event.changedTouches[0].clientY,
                  };
                }}
                onTouchEnd={(event) => {
                  if (column) return;
                  const dx = event.changedTouches[0].clientX - swipe.current.x;
                  const dy = event.changedTouches[0].clientY - swipe.current.y;
                  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
                  go(dx < 0 ? spread + 1 : spread - 1);
                }}
              >
                <div className="ink-bookbar">
                  <button ref={closeRef} type="button" onClick={closeBook}>
                    Close
                  </button>
                  <button
                    type="button"
                    className={focused ? "is-on" : ""}
                    aria-pressed={focused}
                    onClick={() => focus(!focused)}
                  >
                    {focused ? "Exit focus" : "Focus"}
                  </button>
                  <p className="ink-running">{lead.title}</p>
                  {toast ? (
                    <span className="ink-toast" role="status">
                      {toast}
                    </span>
                  ) : null}
                  <button type="button" onClick={share} aria-label={`Share a link to ${lead.title}`}>
                    Share
                  </button>
                  <a
                    className="ink-bookbar-link"
                    href={pdfHref(lead.slug)}
                    download={`skalle-chronicles-${lead.slug}.pdf`}
                    aria-label={`Download ${lead.title} as a PDF`}
                  >
                    PDF
                  </a>
                  <p className="ink-count" aria-live="polite">
                    {column
                      ? readingPage
                      : spread * 2 + 2 <= pages.length
                        ? `${spread * 2 + 1}–${spread * 2 + 2}`
                        : spread * 2 + 1}{" "}
                    / {pages.length}
                  </p>
                </div>
                {column ? (
                  <div ref={scrollRef} className="ink-scroll" onScroll={onColumnScroll}>
                    {pages.map((_, index) => (
                      <div key={index}>{page(index, "right")}</div>
                    ))}
                  </div>
                ) : (
                <>
                <div className="ink-turn">
                  <div className="ink-spread">
                    {page(turn ? (turn.to > turn.from ? turn.from * 2 : turn.to * 2) : spread * 2, "left")}
                    <div className="ink-gutter" aria-hidden="true" />
                    {page(turn ? (turn.to > turn.from ? turn.to * 2 + 1 : turn.from * 2 + 1) : spread * 2 + 1, "right")}
                    {turn ? (
                      <motion.div
                        key={`${turn.from}-${turn.to}`}
                        className={`ink-sheet ${turn.to > turn.from ? "is-next" : "is-prev"}`}
                        initial={{ rotateY: 0 }}
                        animate={{ rotateY: turn.to > turn.from ? -180 : 180 }}
                        transition={{ duration: 0.75, ease: [0.45, 0.05, 0.25, 1] }}
                      >
                        <div className="ink-sheet-face is-front">
                          {page(turn.to > turn.from ? turn.from * 2 + 1 : turn.from * 2, turn.to > turn.from ? "right" : "left")}
                        </div>
                        <div className="ink-sheet-face is-back">
                          {page(turn.to > turn.from ? turn.to * 2 : turn.to * 2 + 1, turn.to > turn.from ? "left" : "right")}
                        </div>
                      </motion.div>
                    ) : null}
                  </div>
                </div>
                <div className="ink-pager">
                  <button type="button" onClick={() => go(spread - 1)} disabled={spread === 0}>
                    Prev
                  </button>
                  <div className="ink-dots">
                    {Array.from({ length: spreadCount }, (_, index) => (
                      <button
                        key={index}
                        type="button"
                        className={index === spread ? "is-on" : ""}
                        aria-label={`Spread ${index + 1}`}
                        aria-current={index === spread ? "page" : undefined}
                        onClick={() => go(index)}
                      />
                    ))}
                  </div>
                  <button type="button" onClick={() => go(spread + 1)} disabled={spread === spreadCount - 1}>
                    Next
                  </button>
                </div>
                </>
                )}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
