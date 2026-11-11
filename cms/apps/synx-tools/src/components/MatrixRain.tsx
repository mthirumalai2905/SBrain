"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const glyphs = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";

export function startMatrixRain() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("synx-matrix"));
}

function RainCanvas({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const fontSize = 16;
    const trail = 18;
    const fadeRows = 8;
    let width = 0;
    let height = 0;
    let columns: { y: number; chars: string[]; settled: boolean; done: boolean }[] = [];
    let finished = false;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(1, Math.ceil(width / fontSize));
      columns = Array.from({ length: count }, () => ({
        y: -Math.random() * 10,
        chars: [],
        settled: false,
        done: false,
      }));
    };

    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    let raf = 0;
    const draw = () => {
      frame += 1;
      ctx.clearRect(0, 0, width, height);
      ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      const fadeBand = fontSize * fadeRows;
      if (frame % 2 === 0) {
        for (const column of columns) {
          if (column.done) continue;
          const head = column.y * fontSize;
          if (!column.settled && head < height) {
            column.chars.unshift(glyphs[Math.floor(Math.random() * glyphs.length)] ?? "0");
            if (column.chars.length > trail) column.chars.pop();
          } else {
            column.settled = true;
          }
          column.y += 1;
          const tail = (column.y - column.chars.length) * fontSize;
          if (column.settled && (column.chars.length === 0 || tail > height)) {
            column.done = true;
            column.chars = [];
          }
        }
      }
      columns.forEach((column, index) => {
        column.chars.forEach((glyph, step) => {
          const y = column.y * fontSize - step * fontSize;
          if (y < -fontSize || y > height) return;
          let alpha = step === 0 ? 0.95 : Math.max(0.08, 0.72 - step * 0.045);
          if (y > height - fadeBand) alpha *= Math.max(0, (height - y) / fadeBand);
          if (alpha <= 0.02) return;
          ctx.fillStyle = step === 0 ? `rgba(182, 243, 208, ${alpha})` : `rgba(34, 197, 94, ${alpha})`;
          ctx.fillText(glyph, index * fontSize, y);
        });
      });
      if (!finished && columns.length > 0 && columns.every((column) => column.done)) {
        finished = true;
        doneRef.current();
        return;
      }
      raf = window.requestAnimationFrame(draw);
    };
    raf = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="matrix-rain" aria-hidden="true" />;
}

export function MatrixRain() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const start = () => setActive((current) => current + 1);
    window.addEventListener("synx-matrix", start);
    return () => window.removeEventListener("synx-matrix", start);
  }, []);

  if (!active || typeof document === "undefined") return null;
  return createPortal(
    <RainCanvas key={active} onDone={() => setActive((current) => (current === active ? 0 : current))} />,
    document.body,
  );
}
