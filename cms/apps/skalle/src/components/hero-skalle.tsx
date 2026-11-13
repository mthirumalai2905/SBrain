"use client";

import { useEffect, useRef } from "react";

export function HeroSkalle({ href, src, alt }: { href: string; src?: string; alt?: string }) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const stage = ref.current;
    if (!stage) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    stage.dataset.device = touch ? "touch" : "pointer";
    if (still) {
      stage.dataset.phase = "live";
      return;
    }

    stage.dataset.phase = "enter";
    const live = window.setTimeout(() => (stage.dataset.phase = "live"), touch ? 1500 : 2000);

    let frame = 0;
    let tx = 0;
    let ty = 0;
    const apply = () => {
      frame = 0;
      stage.style.setProperty("--tx", tx.toFixed(3));
      stage.style.setProperty("--ty", ty.toFixed(3));
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onPointer = (event: PointerEvent) => {
      tx = (event.clientX / window.innerWidth) * 2 - 1;
      ty = (event.clientY / window.innerHeight) * 2 - 1;
      queue();
    };
    const onTilt = (event: DeviceOrientationEvent) => {
      if (event.gamma == null || event.beta == null) return;
      tx = Math.max(-1, Math.min(1, event.gamma / 30));
      ty = Math.max(-1, Math.min(1, (event.beta - 45) / 30));
      stage.dataset.tilt = "";
      queue();
    };

    if (touch) window.addEventListener("deviceorientation", onTilt);
    else window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      window.clearTimeout(live);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("deviceorientation", onTilt);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <a ref={ref} className="lab-stage" href={href}>
      <div className="lab-stage-body">
        <img src={src} alt={alt ?? ""} />
        <i className="lab-stage-eye" style={{ left: "36.6%", top: "16.1%" }} />
        <i className="lab-stage-eye" style={{ left: "49%", top: "14.8%" }} />
      </div>
    </a>
  );
}
