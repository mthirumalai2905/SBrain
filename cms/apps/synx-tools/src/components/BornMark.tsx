"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Confetti from "react-confetti";

const colors = ["#22c55e", "#4ade80", "#b6f3d0", "#ffffff", "#fde68a"];

export function BornMark() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [burst, setBurst] = useState(0);
  const [frame, setFrame] = useState({ width: 0, height: 0, x: 0, y: 0, w: 0, h: 0 });

  function celebrate() {
    const button = buttonRef.current;
    if (!button || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = button.getBoundingClientRect();
    const spread = 220;
    setFrame({
      width: window.innerWidth,
      height: window.innerHeight,
      x: Math.max(0, rect.left + rect.width / 2 - spread / 2),
      y: rect.top,
      w: spread,
      h: rect.height,
    });
    setBurst((count) => count + 1);
  }

  return (
    <>
      <button ref={buttonRef} type="button" className="born-mark" onClick={celebrate} aria-label="Celebrate">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path fill="#22c55e" d="M4 28 13 9l8 7L4 28Z" />
          <path fill="#05210f" d="M7.2 24.2 12.2 14l3.6 3.1L7.2 24.2Z" />
          <rect x="16" y="3" width="13" height="11" fill="#101412" stroke="#6ee7a8" strokeWidth="1.4" />
          <rect x="18.2" y="6.2" width="3.2" height="2.2" fill="#b6f3d0" />
          <rect x="23.4" y="6.2" width="3.2" height="2.2" fill="#b6f3d0" />
          <rect x="18.2" y="10" width="8.4" height="1.3" fill="#22c55e" />
          <rect x="24" y="16" width="2.4" height="2.4" fill="#b6f3d0" />
          <rect x="28" y="11" width="2" height="2" fill="#f4efe6" />
          <rect x="27" y="1" width="2.2" height="2.2" fill="#6ee7a8" />
        </svg>
      </button>
      {burst > 0 &&
        frame.width > 0 &&
        createPortal(
          <Confetti
            key={burst}
            width={frame.width}
            height={frame.height}
            recycle={false}
            numberOfPieces={260}
            gravity={0.12}
            initialVelocityX={10}
            initialVelocityY={10}
            confettiSource={{ x: frame.x, y: frame.y, w: frame.w, h: frame.h }}
            colors={colors}
            style={{ position: "fixed", top: 0, left: 0, zIndex: 40, pointerEvents: "none" }}
          />,
          document.body,
        )}
    </>
  );
}
