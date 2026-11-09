// The "data morph" visual language: a point cloud that reorganizes itself into new formations,
// and words that roll into one another.
import { useEffect, useRef, useState, type CSSProperties } from "react";

export type Formation = "sphere" | "grid" | "wave" | "network" | "helix" | "bars" | "ring" | "cube" | "skyline" | "stream";

const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Small seeded random so every formation looks the same on each visit. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cluster centres used by the network formation (and for its links). */
const HUBS: [number, number, number][] = [
  [0, 0, 0], [0.75, 0.35, 0.1], [-0.7, 0.4, -0.2], [0.2, -0.75, 0.3], [-0.35, -0.55, -0.55], [0.45, 0.5, -0.6], [-0.2, 0.75, 0.55],
];
const LINKS = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 5], [2, 6], [3, 4]];

/** Target positions (x, y, z in about -1..1) for every point of a formation. */
function build(f: Formation, n: number, t = 0): Float32Array {
  const out = new Float32Array(n * 3);
  const r = rng(f.length * 977 + n);
  const side = Math.ceil(Math.sqrt(n));
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, z = 0;
    switch (f) {
      case "sphere": {
        const k = (i + 0.5) / n;
        const phi = Math.acos(1 - 2 * k), th = Math.PI * (1 + Math.sqrt(5)) * i;
        x = Math.cos(th) * Math.sin(phi); y = Math.cos(phi); z = Math.sin(th) * Math.sin(phi);
        break;
      }
      case "grid": {
        x = ((i % side) / (side - 1)) * 2 - 1; z = (Math.floor(i / side) / (side - 1)) * 2 - 1; y = 0;
        x *= 1.05; z *= 1.05;
        break;
      }
      case "wave": {
        x = ((i % side) / (side - 1)) * 2.2 - 1.1; z = (Math.floor(i / side) / (side - 1)) * 2.2 - 1.1;
        y = 0.28 * Math.sin(x * 3 + t * 1.6) * Math.cos(z * 2.2 + t);
        break;
      }
      case "network": {
        const h = HUBS[i % HUBS.length], spread = i % HUBS.length === 0 ? 0.2 : 0.13;
        const a = r() * Math.PI * 2, b = Math.acos(2 * r() - 1), d = Math.cbrt(r()) * spread;
        x = h[0] + Math.cos(a) * Math.sin(b) * d; y = h[1] + Math.cos(b) * d; z = h[2] + Math.sin(a) * Math.sin(b) * d;
        break;
      }
      case "helix": {
        const k = i / n, strand = i % 2, a = k * Math.PI * 7 + strand * Math.PI;
        const rung = i % 9 === 0 ? r() : 1;
        x = Math.cos(a) * 0.55 * rung; z = Math.sin(a) * 0.55 * rung; y = k * 2.1 - 1.05;
        break;
      }
      case "bars": {
        const cols = 6, col = i % (cols * cols), cx = col % cols, cz = Math.floor(col / cols);
        const hr = rng(col * 31 + 7)();
        const height = 0.25 + hr * 1.5;
        x = (cx / (cols - 1)) * 1.6 - 0.8 + (r() - 0.5) * 0.08;
        z = (cz / (cols - 1)) * 1.6 - 0.8 + (r() - 0.5) * 0.08;
        y = -0.85 + r() * height;
        break;
      }
      case "ring": {
        const a = r() * Math.PI * 2, b = r() * Math.PI * 2, tube = 0.16;
        x = (0.78 + tube * Math.cos(b)) * Math.cos(a); z = (0.78 + tube * Math.cos(b)) * Math.sin(a); y = tube * Math.sin(b);
        break;
      }
      case "stream": {
        // a long horizontal double helix, like data flowing across
        const k = i / n, strand = i % 2, a = k * Math.PI * 9 + strand * Math.PI;
        x = k * 3 - 1.5; y = Math.cos(a) * 0.32; z = Math.sin(a) * 0.32;
        break;
      }
      case "skyline": {
        // a wide row of columns whose heights rise and fall over time, like live usage
        const cols = 30, rows = 3, col = i % (cols * rows), cx = col % cols, cz = Math.floor(col / cols);
        const base = rng(col * 17 + 3)();
        const height = 0.12 + base * 0.7 * (0.75 + 0.25 * Math.sin(t * 1.1 + cx * 0.55));
        x = (cx / (cols - 1)) * 3.2 - 1.6 + (r() - 0.5) * 0.04;
        z = (cz / (rows - 1)) * 0.5 - 0.25;
        y = 0.45 - r() * height;
        break;
      }
      case "cube": {
        const face = Math.floor(r() * 6), u = r() * 2 - 1, v = r() * 2 - 1, s = 0.72;
        const p = [u * s, v * s, (face % 2 ? 1 : -1) * s];
        const ax = Math.floor(face / 2);
        [x, y, z] = ax === 0 ? p : ax === 1 ? [p[2], p[0], p[1]] : [p[1], p[2], p[0]];
        break;
      }
    }
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  return out;
}

const COLORS = [
  [196, 181, 253], // lavender
  [167, 139, 250], // violet
  [251, 146, 160], // coral (sunrise)
];

/**
 * Point cloud that swarms from one formation into the next. Points move at slightly different speeds,
 * so a change reads as data reorganizing itself. Only animates while on screen.
 */
export function DataMorph({
  formation = "sphere",
  count = 900,
  tilt = 0.38,
  fit = "min",
  zoom = 1,
  spin = 0.0035,
  dot = 1,
  className = "",
}: {
  formation?: Formation;
  count?: number;
  tilt?: number;
  /** size the cloud from the smaller side ("min") or from the width ("width", for wide bands and big globes) */
  fit?: "min" | "width";
  zoom?: number;
  /** rotation per frame, in radians */
  spin?: number;
  /** point size multiplier */
  dot?: number;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const goal = useRef(formation);
  goal.current = formation;

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const n = count;
    const pos = build(goal.current, n);
    let target: Float32Array = pos.slice();
    let current: Formation = goal.current;
    const speed = Float32Array.from({ length: n }, (_, i) => 0.035 + ((i * 7919) % 100) / 100 * 0.06);
    const tint = Uint8Array.from({ length: n }, (_, i) => (i * 13) % 3);
    let linkAlpha = current === "network" ? 1 : 0;
    let w = 0, h = 0, dpr = 1;
    let rot = 0, t = 0, raf = 0, visible = false;
    // hover: a card marked data-morph-hover wakes its cloud up (faster spin, a little bigger, brighter)
    let boost = 0, boostGoal = 0;
    const host = cv.closest<HTMLElement>("[data-morph-hover]");
    const wake = () => {
      boostGoal = 1;
      if (!raf && visible) raf = requestAnimationFrame(draw);
    };
    const rest = () => {
      boostGoal = 0;
    };
    const still = reduce();

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    };

    const project = (x: number, y: number, z: number) => {
      const cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt);
      const x1 = x * cr - z * sr, z1 = x * sr + z * cr;
      const y1 = y * ct - z1 * st, z2 = y * st + z1 * ct;
      const s = 3.2 / (3.2 - z2), R = (fit === "width" ? w * 0.42 : Math.min(w, h) * 0.36) * zoom * (1 + 0.08 * boost);
      return [w / 2 + x1 * s * R, h / 2 + y1 * s * R, z2, s] as const;
    };

    const draw = () => {
      raf = 0;
      if (current !== goal.current) {
        current = goal.current;
        target = build(current, n, t);
      } else if ((current === "wave" || current === "skyline") && !still) {
        target = build(current, n, t);
      }
      linkAlpha += ((current === "network" ? 1 : 0) - linkAlpha) * 0.05;
      if (!still) {
        boost += (boostGoal - boost) * 0.08;
        rot += spin + boost * 0.012;
        t += 0.016;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      if (linkAlpha > 0.02) {
        ctx.lineWidth = 1;
        for (const [a, b] of LINKS) {
          const p = project(...HUBS[a]), q = project(...HUBS[b]);
          ctx.strokeStyle = `rgba(167,139,250,${0.35 * linkAlpha})`;
          ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
        }
      }

      const base = Math.max(1.2, (Math.min(w, h) / 320) * dot);
      for (let i = 0; i < n; i++) {
        const j = i * 3;
        const k = still ? 1 : speed[i];
        pos[j] += (target[j] - pos[j]) * k;
        pos[j + 1] += (target[j + 1] - pos[j + 1]) * k;
        pos[j + 2] += (target[j + 2] - pos[j + 2]) * k;
        const [sx, sy, z, s] = project(pos[j], pos[j + 1], pos[j + 2]);
        const depth = (z + 1.2) / 2.4; // 0 far .. 1 near
        const c = COLORS[tint[i]];
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${Math.min(1, 0.25 + depth * 0.75 + boost * 0.2).toFixed(3)})`;
        const size = base * s * (0.6 + depth * 0.8);
        ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
      }
      ctx.globalCompositeOperation = "source-over";
      if (visible && !still) raf = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(() => {
      resize();
      if (!raf) draw();
    });
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(draw);
    });
    io.observe(cv);
    host?.addEventListener("pointerenter", wake);
    host?.addEventListener("pointerleave", rest);
    const redraw = () => {
      if (!raf) draw();
    };
    cv.addEventListener("redraw", redraw);
    resize();
    draw();
    return () => {
      ro.disconnect();
      io.disconnect();
      cv.removeEventListener("redraw", redraw);
      host?.removeEventListener("pointerenter", wake);
      host?.removeEventListener("pointerleave", rest);
      cancelAnimationFrame(raf);
    };
  }, [count, tilt, fit, zoom, spin, dot]);

  // Reduced motion: no loop is running, so redraw when the formation changes.
  useEffect(() => {
    if (reduce()) canvas.current?.dispatchEvent(new Event("redraw"));
  }, [formation]);

  return <canvas ref={canvas} className={`dmorph ${className}`} aria-hidden />;
}

/** Cycles formations on a timer and reports the current one. */
export function useFormationCycle(list: Formation[], every = 3600) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce()) return;
    const id = window.setInterval(() => setI((x) => (x + 1) % list.length), every);
    return () => window.clearInterval(id);
  }, [list.length, every]);
  return list[i];
}

/** Letter colour along a word, following the sunrise: lavender → pink → peach. */
const SUNRISE = [[196, 181, 253], [240, 171, 252], [253, 186, 116]];
function tint(k: number, len: number) {
  const t = len > 1 ? k / (len - 1) : 0;
  const seg = Math.min(1, Math.floor(t * 2)), u = t * 2 - seg;
  const a = SUNRISE[seg], b = SUNRISE[seg + 1];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(",")})`;
}

/** Word that rolls into the next one: each letter flips up and out while the new word's letters roll in. */
export function RollText({ words: list, every = 2600, index }: { words: string[]; every?: number; index?: number }) {
  // parents pass a fresh array on every render; only restart when the words themselves change
  const key = list.join("|");
  const [state, setState] = useState({ i: 0, prev: -1, n: 0 });

  // controlled: the parent decides which word shows (and when it changes)
  useEffect(() => {
    if (index === undefined) return;
    setState((s) => (s.i === index ? s : { i: index, prev: s.i, n: s.n + 1 }));
  }, [index]);

  useEffect(() => {
    if (index !== undefined) return;
    const len = key.split("|").length;
    setState({ i: 0, prev: -1, n: 0 });
    const id = window.setInterval(() => setState((s) => ({ i: (s.i + 1) % len, prev: s.i, n: s.n + 1 })), every);
    return () => window.clearInterval(id);
    // whether `index` is passed is fixed at mount, so it isn't a dependency here
  }, [key, every]);

  const words = key.split("|");
  const word = (w: string, cls: string) => (
    <span className={`roll-word ${cls}`} key={`${cls}-${state.n}`} aria-hidden>
      {[...w].map((ch, k) => (
        <span key={k} style={{ "--k": k, color: tint(k, w.length) } as CSSProperties}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );

  return (
    <span className="roll">
      {/* invisible copies reserve the width of the longest word */}
      {words.map((w) => (
        <span key={w} className="roll-sizer" aria-hidden>
          {w}
        </span>
      ))}
      {state.prev >= 0 && word(words[state.prev], "out")}
      {word(words[state.i], state.n ? "in" : "")}
      <span className="sr">{words.join(", ")}</span>
    </span>
  );
}
