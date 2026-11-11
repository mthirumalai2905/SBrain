"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

function GlossCard({ title, hint }: { title: string; hint: string }) {
  return (
    <span className="gloss-card" role="tooltip">
      <span className="gloss-corner tl" />
      <span className="gloss-corner tr" />
      <span className="gloss-corner bl" />
      <span className="gloss-corner br" />
      <span className="gloss-card-title">{title}</span>
      <span className="gloss-card-body">{hint}</span>
    </span>
  );
}

export function Gloss({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  const uid = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<number | undefined>(undefined);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [useOverlay, setUseOverlay] = useState(false);
  const [mounted, setMounted] = useState(false);
  const open = pinned || hovered;

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 767px), (hover: none)");
    const apply = () => setUseOverlay(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setPinned(false);
      setHovered(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (overlayRef.current?.contains(target)) return;
      close();
    };
    const onOther = (event: Event) => {
      const otherId = (event as CustomEvent<string>).detail;
      if (otherId !== uid) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("synx:termhint", onOther);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("synx:termhint", onOther);
    };
  }, [open, uid]);

  useEffect(() => {
    if (!useOverlay || !open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [useOverlay, open]);

  const close = () => {
    setPinned(false);
    setHovered(false);
  };

  const toggle = () => {
    window.dispatchEvent(new CustomEvent("synx:termhint", { detail: uid }));
    setHovered(false);
    setPinned((value) => !value);
  };

  const onEnter = () => {
    if (useOverlay) return;
    window.clearTimeout(leaveTimer.current);
    setHovered(true);
  };

  const onLeave = () => {
    if (useOverlay || pinned) return;
    leaveTimer.current = window.setTimeout(() => setHovered(false), 120);
  };

  return (
    <span ref={rootRef} className="gloss" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        type="button"
        className="gloss-btn"
        aria-expanded={open}
        aria-label={`Explain ${title}`}
        onClick={toggle}
      >
        {children}
      </button>
      {!useOverlay && open ? (
        <span className="gloss-pop">
          <GlossCard title={title} hint={hint} />
        </span>
      ) : null}
      {mounted && useOverlay && open
        ? createPortal(
            <div
              className="gloss-shade"
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) close();
              }}
            >
              <div ref={overlayRef} className="gloss-sheet">
                <GlossCard title={title} hint={hint} />
                <button type="button" className="gloss-close" onClick={close}>
                  Close
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
