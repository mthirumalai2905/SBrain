"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Reveal({ children, light = false }: { children: ReactNode; light?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const zone = ref.current;
    if (!zone) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const top = zone.getBoundingClientRect().top;
      const atEnd = window.scrollY + vh >= document.documentElement.scrollHeight - 2;
      const enter = atEnd ? 1 : Math.min(1, Math.max(0, (vh - top) / (vh * 0.6)));
      zone.style.setProperty("--enter", enter.toFixed(3));
      zone.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
        const box = el.getBoundingClientRect();
        const p = (box.top + box.height / 2 - vh / 2) / (vh / 2 + box.height / 2);
        el.style.setProperty("--p", Math.min(1, Math.max(-1, p)).toFixed(3));
      });
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={light ? "lab-reveal lab-light" : "lab-reveal"}
      data-nav-theme={light ? "light" : undefined}
    >
      {children}
    </div>
  );
}

export function LightZone({ children }: { children: ReactNode }) {
  return <Reveal light>{children}</Reveal>;
}
