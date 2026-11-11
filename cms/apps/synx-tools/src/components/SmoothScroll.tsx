"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { isIos } from "@/lib/ios";

function pointerOnScrollbar(event: PointerEvent) {
  const gutter = window.innerWidth - document.documentElement.clientWidth;
  if (gutter < 1) return false;
  if (event.clientX >= window.innerWidth - gutter - 2) return true;
  const target = event.target;
  return target instanceof Element && event.offsetX > target.clientWidth;
}

export function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // Lenis eases wheel input, and while that ease is running it ignores the
    // native scrollbar and writes its own position back every frame. The thumb
    // then fights the cursor. Scrolls Lenis applies go through window.scrollTo,
    // so a thumb drag or key press can be told apart and can take over at once.
    let holdingScrollbar = false;
    let fromLenis = false;
    const previousScrollTo = window.scrollTo;
    window.scrollTo = ((...args: Parameters<typeof window.scrollTo>) => {
      fromLenis = true;
      try {
        previousScrollTo.apply(window, args);
      } finally {
        fromLenis = false;
      }
    }) as typeof window.scrollTo;

    const lenis = new Lenis({
      autoRaf: true,
      anchors: { offset: -20 },
      smoothWheel: true,
      syncTouch: !isIos(),
      lerp: 0.045,
      wheelMultiplier: 0.8,
      virtualScroll(data) {
        if (!holdingScrollbar) return true;
        const buttons = "buttons" in data.event ? data.event.buttons : 0;
        if (!buttons) {
          holdingScrollbar = false;
          return true;
        }
        return false;
      },
    });

    const releaseSmoothScroll = () => {
      const y = window.scrollY;
      if (lenis.isScrolling === "smooth" && Math.abs(lenis.targetScroll - y) < 0.5) {
        lenis.scrollTo(y > 0 ? y - 1 : 1, { immediate: true, force: true });
      }
      lenis.scrollTo(y, { immediate: true, force: true });
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !pointerOnScrollbar(event)) return;
      holdingScrollbar = true;
      releaseSmoothScroll();
    };

    const onPointerUp = () => {
      if (!holdingScrollbar) return;
      holdingScrollbar = false;
      releaseSmoothScroll();
    };

    const onScroll = () => {
      if (fromLenis || lenis.isScrolling !== "smooth") return;
      if (Math.abs(window.scrollY - lenis.animatedScroll) < 0.5) return;
      releaseSmoothScroll();
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerUp, true);
    window.addEventListener("mouseup", onPointerUp, true);
    window.addEventListener("blur", onPointerUp);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      window.scrollTo = previousScrollTo;
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerUp, true);
      window.removeEventListener("mouseup", onPointerUp, true);
      window.removeEventListener("blur", onPointerUp);
      window.removeEventListener("scroll", onScroll, true);
      lenis.destroy();
    };
  }, []);

  return null;
}
