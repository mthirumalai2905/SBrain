"use client";

import { useEffect, useRef, useState } from "react";
import { mediaUrl, useShared } from "@/lib/cms";

export function NavSkalle() {
  const { header = {} } = useShared();
  const lead: string = header.comingSoonLead ?? "Skalle AI";
  const line = `${lead}\u00A0${header.comingSoonText ?? "coming soon"}`;
  const root = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [count, setCount] = useState(0);
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (!open) return;
    if (reduce.current) {
      setCount(line.length);
      return;
    }
    if (count >= line.length) return;
    const wait = count === 0 ? 520 : line[count] === " " || line[count] === "\u00A0" ? 90 : 42;
    const id = window.setTimeout(() => setCount((value) => value + 1), wait);
    return () => window.clearTimeout(id);
  }, [open, count]);

  useEffect(() => {
    if (!pinned) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setPinned(false);
        setOpen(false);
        setCount(0);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [pinned]);

  function show() {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setOpen(true);
  }

  function hide() {
    if (pinned) return;
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setOpen(false);
      setCount(0);
    }, 220);
  }

  function toggle() {
    if (pinned) {
      setPinned(false);
      setOpen(false);
      setCount(0);
      return;
    }
    setPinned(true);
    if (!open) setCount(0);
    setOpen(true);
  }

  const shown = line.slice(0, count);
  const speaking = open && count < line.length;

  return (
    <div
      className={`nav-skalle${open ? " on" : ""}${speaking ? " speaking" : ""}`}
      ref={root}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        type="button"
        className="nav-skalle-hit"
        aria-expanded={open}
        aria-label="Skalle AI coming soon"
        onClick={toggle}
        onFocus={show}
        onBlur={hide}
      >
        <img src={mediaUrl(header.skalleAvatar) ?? "/img/robot-left.jpg"} alt="" />
      </button>
      <div className="nav-skalle-say" role="status">
        <span className="nav-skalle-notch" aria-hidden="true" />
        <div className="nav-skalle-who">
          <span className="nav-skalle-glyph">
            <img src={mediaUrl(header.skalleGlyph) ?? "/img/skalle.png"} alt="" />
          </span>
          <small>{header.skalleName ?? "Skalle"}</small>
          <i className="nav-skalle-live" aria-hidden="true" />
        </div>
        <p className="nav-skalle-line">
          <span className="nav-skalle-sizer" aria-hidden="true">{line}</span>
          <span className="nav-skalle-typed">
            {count === 0 ? (
              <span className="nav-skalle-dots" aria-hidden="true"><i /><i /><i /></span>
            ) : (
              <>
                <span>{shown.slice(0, lead.length)}</span>
                <span className="nav-skalle-soon">{shown.slice(lead.length)}</span>
                <i className="nav-skalle-caret" aria-hidden="true" />
              </>
            )}
          </span>
        </p>
      </div>
    </div>
  );
}
