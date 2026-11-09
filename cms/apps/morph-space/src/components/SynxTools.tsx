import { useEffect, useRef, useState } from "react";

/* Product icons, rebuilt from the Figma "Synx Tools" component (node 24:2687).
   Each is a set of rounded bars in a 40×40 box; values are the Figma coordinates. */

type Bar = [x: number, y: number, w: number];

// Synx PASS and Synx BIOS share this mark (inner group offset 5.538, 7.059; bars 3.045 high)
const PASS: Bar[] = [
  [6.6, 0, 15.73],
  [5.83, 4.57, 6.85], [16.24, 4.57, 6.85],
  [3.04, 9.13, 8.119], [17.76, 9.13, 8.119],
  [1.01, 13.7, 9.641], [18.27, 13.7, 9.641],
  [0, 18.27, 10.656], [18.27, 18.27, 10.656],
  [0, 22.83, 10.656], [18.27, 22.83, 10.656],
];

// Synx DNS (the Figma group is rotated 180°; these are the resolved positions, offset 5.64, 7.06)
const DNS: Bar[] = [
  [0, 0, 7.053], [13.6, 0, 15.113],
  [0, 4.57, 15.617], [20.653, 4.57, 8.06],
  [0, 9.14, 7.053], [15.111, 9.14, 13.602],
  [0, 13.7, 19.143], [21.63, 13.7, 7.053],
  [0, 18.27, 7.053], [11.585, 18.27, 17.128],
  [0, 22.84, 15.113], [21.66, 22.84, 7.053],
];

// SKALLE (absolute in the 40×40 box; bars 3.056 high)
const SKALLE: Bar[] = [
  [9.91, 7.08, 20.183],
  [6.3, 11.64, 27.392],
  [8.47, 16.19, 8.073], [23.46, 16.19, 8.073],
  [8.18, 20.75, 23.643],
  [12.07, 25.31, 15.858],
  [14.81, 29.86, 2.883], [18.56, 29.86, 2.883], [22.31, 29.86, 2.883],
];

function Mark({ bars, dx = 0, dy = 0, h = 3.045 }: { bars: Bar[]; dx?: number; dy?: number; h?: number }) {
  return (
    <svg className="tool-mark" width="40" height="40" viewBox="0 0 40 40" aria-hidden>
      <g transform={`translate(${dx} ${dy})`}>
        {bars.map(([x, y, w], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx={h / 2} />
        ))}
      </g>
    </svg>
  );
}

// Links are placeholders until the real tool URLs are known.
export const synxTools = [
  { name: "Synx PASS", href: "#", mark: <Mark bars={PASS} dx={5.538} dy={7.059} /> },
  { name: "Synx DNS", href: "#", mark: <Mark bars={DNS} dx={5.64} dy={7.06} /> },
  { name: "Synx BIOS", href: "#", mark: <Mark bars={PASS} dx={5.538} dy={7.059} /> },
  { name: "SKALLE", href: "#", mark: <Mark bars={SKALLE} h={3.056} /> },
];

export function SynxToolsGrid({ onPick }: { onPick?: () => void }) {
  return (
    <ul className="tools-grid">
      {synxTools.map((t) => (
        <li key={t.name}>
          <a href={t.href} className="tools-item" onClick={onPick}>
            <span className="tool-icon">{t.mark}</span>
            <span className="tool-name">{t.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

// Launcher glyph from Figma: outlined squares at rest, filled on hover / when open.
const SQUARES = [
  "M10 8.52758V3.9823C10 2.57066 9.36 2 7.77 2H3.73C2.14 2 1.5 2.57066 1.5 3.9823V8.51757C1.5 9.93922 2.14 10.4999 3.73 10.4999H7.77C9.36 10.5099 10 9.93922 10 8.52758Z",
  "M21.5 8.52758V3.9823C21.5 2.57066 20.86 2 19.27 2H15.23C13.64 2 13 2.57066 13 3.9823V8.51757C13 9.93922 13.64 10.4999 15.23 10.4999H19.27C20.86 10.5099 21.5 9.93922 21.5 8.52758Z",
  "M10 19.77V15.73C10 14.14 9.36 13.5 7.77 13.5H3.73C2.14 13.5 1.5 14.14 1.5 15.73V19.77C1.5 21.36 2.14 22 3.73 22H7.77C9.36 22 10 21.36 10 19.77Z",
  "M21.5 19.77V15.73C21.5 14.14 20.86 13.5 19.27 13.5H15.23C13.64 13.5 13 14.14 13 15.73V19.77C13 21.36 13.64 22 15.23 22H19.27C20.86 22 21.5 21.36 21.5 19.77Z",
];

/** App-launcher button with a "Synx Tools" tooltip and a dropdown of the tools. */
export default function SynxToolsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`tools ${open ? "open" : ""}`} ref={ref}>
      <button
        type="button"
        className="tools-btn"
        aria-label="Synx Tools"
        aria-expanded={open}
        aria-controls="synx-tools"
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
          {SQUARES.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
        <span className="tools-tip" aria-hidden>
          Synx Tools
        </span>
      </button>
      {open && (
        <div className="tools-pop" id="synx-tools" role="dialog" aria-label="Synx Tools">
          <p className="tools-title">Synx Tools</p>
          <hr className="tools-divider" />
          <SynxToolsGrid onPick={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
