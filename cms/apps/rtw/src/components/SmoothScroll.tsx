"use client";

import { useEffect, type ReactNode } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";

function ScrollLock() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;
    const scroller = lenis;

    function sync() {
      if (document.body.style.overflow === "hidden") scroller.stop();
      else scroller.start();
    }

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, [lenis]);

  return null;
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.078,
        wheelMultiplier: 0.84,
        touchMultiplier: 1,
        anchors: {
          offset: -80,
          duration: 1.2,
          easing: (t) => 1 - (1 - t) ** 3,
        },
        allowNestedScroll: true,
        stopInertiaOnNavigate: true,
        respectReducedMotion: true,
        prevent: (node) => Boolean(node.closest(".nav-scroll, [data-lenis-prevent]")),
      }}
    >
      <ScrollLock />
      {children}
    </ReactLenis>
  );
}
