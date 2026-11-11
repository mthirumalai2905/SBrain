"use client";

import { animate, type AnimationPlaybackControls } from "framer-motion";
import { useLayoutEffect } from "react";

const rise = ".bento .card, .mosaic .tile, .steps .card, .roles .card, .pair-card, .price-card, .person, .value";
const ease = [0.22, 1, 0.36, 1] as const;

export function Dynamics() {
  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const running: AnimationPlaybackControls[] = [];
    const observers: IntersectionObserver[] = [];
    const unlisten: Array<() => void> = [];

    document.querySelectorAll<HTMLElement>(rise).forEach((el) => {
      el.style.opacity = "0";
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries[0]?.isIntersecting) return;
          observer.disconnect();
          const siblings = el.parentElement ? [...el.parentElement.children] : [el];
          const index = Math.max(0, siblings.indexOf(el));
          running.push(
            animate(el, { opacity: 1, y: [22, 0] }, { duration: 0.7, delay: index * 0.07, ease }),
          );
        },
        { threshold: 0.18 },
      );
      observer.observe(el);
      observers.push(observer);
    });

    const bind = (selector: string, over: Record<string, number>, out: Record<string, number>) => {
      document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        const enter = () => {
          running.push(animate(el, over, { duration: 0.35, ease }));
        };
        const leave = () => {
          running.push(animate(el, out, { duration: 0.45, ease }));
        };
        el.addEventListener("pointerenter", enter);
        el.addEventListener("pointerleave", leave);
        unlisten.push(() => {
          el.removeEventListener("pointerenter", enter);
          el.removeEventListener("pointerleave", leave);
        });
      });
    };

    bind(".btn", { scale: 1.045 }, { scale: 1 });
    bind(".trust-name", { scale: 1.06 }, { scale: 1 });

    return () => {
      observers.forEach((observer) => observer.disconnect());
      unlisten.forEach((stop) => stop());
      running.forEach((control) => control.stop());
    };
  }, []);

  return null;
}
