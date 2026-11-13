"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";


const ManualContext = createContext<(() => void) | null>(null);

export function SpecManualRoot({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const openManual = useCallback(() => {
    setSession((value) => value + 1);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <ManualContext.Provider value={openManual}>
      {children}
      {open ? <SpecExperience key={session} onClose={close} /> : null}
    </ManualContext.Provider>
  );
}

export function OpenManual({ children, className }: { children: ReactNode; className?: string }) {
  const open = useContext(ManualContext);
  return (
    <button className={className} type="button" aria-haspopup="dialog" onClick={() => open?.()}>
      {children}
    </button>
  );
}

type Spec = {
  id: string;
  short: string;
  title: string;
  code: string;
  kind: string;
  line: string;
  log: readonly string[];
  pros: readonly string[];
  aliases: readonly string[];
};

/** The spec manual's content lives in the CMS ("Spec manual"). setManual() fills these before the page is drawn. */
let specs: Spec[] = [];
let ops: { name: string; body: string }[] = [];
let extras = { image: "", imageAlt: "", bound: "", hint: "", close: "Close" };

const lines = (v: unknown) => String(v ?? "").split("\n").map((x) => x.trim()).filter(Boolean);

export function setManual(doc?: Record<string, any>) {
  const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
  specs = arr(doc?.specs).map((s) => ({
    id: s.id, short: s.short, title: s.title, code: s.code, kind: s.kind, line: s.line,
    log: lines(s.log), pros: lines(s.pros), aliases: String(s.aliases ?? "").split(",").map((x) => x.trim()).filter(Boolean),
  }));
  ops = arr(doc?.jobs).map((j) => ({ name: j.name, body: j.body }));
  extras = { image: doc?.image ?? "", imageAlt: doc?.imageAlt ?? "", bound: doc?.boundLabel ?? "", hint: doc?.hint ?? "", close: doc?.closeLabel ?? "Close" };
}

function SpecExperience({ onClose }: { onClose: () => void }) {
  const reduce =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [phase, setPhase] = useState<"grid" | "term">(reduce ? "term" : "grid");
  const overlayRef = useRef<HTMLDivElement>(null);
  const finish = useCallback(() => setPhase("term"), []);

  useEffect(() => {
    const root = overlayRef.current;
    const previously = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !root) return;
      const nodes = [...root.querySelectorAll<HTMLElement>("button, input")].filter(
        (node) => !node.hasAttribute("disabled"),
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previously?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="man-overlay"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="man-title"
    >
      {phase === "grid" ? <PixelField onDone={finish} /> : <ManualPlate onClose={onClose} />}
    </div>
  );
}

function PixelField({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skipRef = useRef<() => void>(() => {});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let stopped = false;
    const started = performance.now();
    const armAt = started + 420;

    const finish = () => {
      if (stopped) return;
      stopped = true;
      window.cancelAnimationFrame(frame);
      onDoneRef.current();
    };
    const skip = () => {
      if (performance.now() < armAt) return;
      finish();
    };
    skipRef.current = skip;

    const draw = (now: number) => {
      if (stopped) return;
      const t = (now - started) / 1000;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, canvas.clientWidth);
      const h = Math.max(1, canvas.clientHeight);
      const pw = Math.round(w * dpr);
      const ph = Math.round(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#070907";
      ctx.fillRect(0, 0, w, h);

      const step = Math.max(11, Math.round(Math.max(w, h) / 108));
      const cols = Math.max(1, Math.floor(w / step));
      const rows = Math.max(1, Math.floor(h / step));
      const ox = Math.floor((w - cols * step) / 2);
      const oy = Math.floor((h - rows * step) / 2);
      const layout = wordLayout(cols, rows);
      const fadeIn = smooth(0, 0.35, t);
      const wA = 1 - smooth(1.45, 1.95, t);
      const wB = smooth(1.45, 1.95, t) * (1 - smooth(2.8, 3.25, t));
      const wC = smooth(2.8, 3.3, t);

      for (let y = 0; y < rows; y += 1) {
        const shear = Math.sin(y * 0.42 + t * 1.7) * 6 * wA;
        for (let x = 0; x < cols; x += 1) {
          const nx = x / cols;
          const ny = y / rows;
          const wave = 0.5 + 0.5 * Math.sin(nx * 9.5 + t * 2.3) * Math.sin(ny * 7.4 - t * 1.65);
          const sweep = 0.5 + 0.5 * Math.sin((nx * 1.6 + ny) * 8 - t * 3.1);
          const scan = Math.abs(ny - ((t * 0.22) % 1)) < 0.025 ? 1 : 0;
          const sceneA = Math.min(1, wave * 0.72 + sweep * 0.38 + scan);
          const bar = x % 2 === 0;
          const height = 0.12 + 0.88 * (0.5 + 0.5 * Math.sin(x * 0.41 + t * 3.4));
          const sceneB = !bar ? 0.04 : 1 - ny < height ? 0.45 + 0.55 * ((1 - ny) / height) : 0.05;
          const wordOn = sampleWord(x, y, layout);
          const sceneC = wordOn ? 1 : 0.045;
          const dx = nx - 0.5;
          const dy = ny - 0.48;
          const falloff = wordOn ? 1 : Math.min(1, Math.max(0.2, 1.2 - Math.hypot(dx, dy) * 1.45));
          const energy =
            (sceneA * wA + sceneB * wB + sceneC * wC) * fadeIn * (wordOn && wC > 0.45 ? 1 : falloff);
          const lit = Math.max(0.045, Math.min(1, energy));
          const acid = (wordOn && wC > 0.4) || lit > 0.82;
          const size = Math.max(1, Math.round(step * (wordOn && wC > 0.45 ? 0.84 : 0.18 + lit * 0.62)));
          const px = Math.round(ox + x * step + (step - size) / 2 + shear);
          const py = Math.round(oy + y * step + (step - size) / 2);
          ctx.globalAlpha = 0.14 + lit * 0.86;
          ctx.fillStyle = acid ? "#ffb01a" : "#f4f1e8";
          ctx.fillRect(px, py, size, size);
        }
      }

      ctx.globalAlpha = 1;
      const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w * 0.72);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ffb01a";
      ctx.fillRect(0, h - 3, w * Math.min(1, t / 4.7), 3);

      if (t > 4.35) {
        ctx.fillStyle = `rgba(255, 176, 26, ${smooth(4.35, 4.72, t)})`;
        ctx.fillRect(0, 0, w, h);
      }
      if (t >= 4.82) {
        finish();
        return;
      }
      frame = window.requestAnimationFrame(draw);
    };

    buttonRef.current?.focus();
    frame = window.requestAnimationFrame(draw);
    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      skipRef.current = () => {};
    };
  }, []);

  return (
    <div className="px-stage">
      <h2 id="man-title" className="man-visually-hidden">
        Skalle
      </h2>
      <canvas ref={canvasRef} aria-hidden="true" />
      <button
        className="px-hit"
        type="button"
        ref={buttonRef}
        aria-label="Continue"
        onClick={() => skipRef.current()}
      />
    </div>
  );
}

const WORD = "SKALLE";
const GLYPH_5: Record<string, string[]> = {
  S: ["01110", "10001", "10000", "01110", "00001", "10001", "01110"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
};
const GLYPH_3: Record<string, string[]> = {
  S: ["111", "100", "111", "001", "111"],
  K: ["101", "110", "100", "110", "101"],
  A: ["010", "101", "111", "101", "101"],
  L: ["100", "100", "100", "100", "111"],
  E: ["111", "100", "111", "100", "111"],
};

function wordLayout(cols: number, rows: number) {
  const glyphs = cols >= 72 ? GLYPH_5 : GLYPH_3;
  const gw = cols >= 72 ? 5 : 3;
  const gh = glyphs.S.length;
  const totalW = WORD.length * (gw + 1) - 1;
  let boxCols = Math.min(cols * 0.74, rows * 0.5 * (totalW / gh));
  if (boxCols < totalW && cols > totalW + 1) boxCols = totalW;
  const boxRows = boxCols * (gh / totalW);
  return {
    glyphs,
    gw,
    gh,
    totalW,
    boxCols,
    boxRows,
    x0: (cols - boxCols) / 2,
    y0: (rows - boxRows) / 2 - rows * 0.02,
  };
}

function sampleWord(x: number, y: number, layout: ReturnType<typeof wordLayout>) {
  const lx = (x + 0.5 - layout.x0) / layout.boxCols;
  const ly = (y + 0.5 - layout.y0) / layout.boxRows;
  if (lx < 0 || ly < 0 || lx >= 1 || ly >= 1) return false;
  const gx = lx * layout.totalW;
  let cursor = 0;
  for (const char of WORD) {
    if (gx >= cursor && gx < cursor + layout.gw) {
      const column = Math.min(layout.gw - 1, Math.floor(gx - cursor));
      const row = Math.min(layout.gh - 1, Math.floor(ly * layout.gh));
      return layout.glyphs[char][row][column] === "1";
    }
    cursor += layout.gw + 1;
  }
  return false;
}

function smooth(from: number, to: number, value: number) {
  if (value <= from) return 0;
  if (value >= to) return 1;
  const t = (value - from) / (to - from);
  return t * t * (3 - 2 * t);
}

function findSpec(command: string) {
  return specs.find((spec) => spec.aliases.includes(command)) ?? null;
}

function ManualPlate({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [op, setOp] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const spec = specs[index];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const select = useCallback((next: number) => {
    setIndex(next);
    setOp(null);
    setNote(null);
  }, []);

  const run = useCallback(
    (raw: string) => {
      const command = raw.trim().toLowerCase().replace(/\s+/g, " ");
      if (!command) return;
      if (command === "close" || command === "exit" || command === "quit") {
        onClose();
        return;
      }
      if (command === "help" || command === "?") {
        setNote(extras.hint);
        return;
      }
      if (command === "next") {
        select((index + 1) % specs.length);
        return;
      }
      if (command === "reset") {
        select(0);
        return;
      }
      const found = findSpec(command);
      if (found) {
        select(specs.indexOf(found));
        return;
      }
      const job = ops.findIndex((item) => item.name.toLowerCase().includes(command));
      if (job >= 0) {
        setIndex(3);
        setOp(job);
        setNote(null);
        return;
      }
      setNote(`No spec matches "${raw.trim()}". Type help for the list.`);
    },
    [index, onClose, select],
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(draft);
    setDraft("");
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowRight" && !draft) {
      event.preventDefault();
      select((index + 1) % specs.length);
    } else if (event.key === "ArrowLeft" && !draft) {
      event.preventDefault();
      select((index + specs.length - 1) % specs.length);
    }
  }

  const stamp = String(tick % 1000).padStart(3, "0");
  const payload = op !== null ? ops[op].body : spec.line;

  return (
    <div className="man-back">
      <div className="man-crt">
        <div className="man-chips">
          <span>Source: Spec sheet</span>
          <span className="man-chip">Uplink open</span>
          <span className="man-chip">Frame {stamp}</span>
          <button className="man-chip" type="button" onClick={onClose}>
            {extras.close}
          </button>
        </div>

        <div className="man-deck">
          <section className="man-pane" aria-label="Spec terminal">
            <form className="man-login" onSubmit={onSubmit}>
              <span>Query:</span>
              <label className="man-visually-hidden" htmlFor="man-command">
                Type a spec name
              </label>
              <input
                id="man-command"
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </form>

            <h2 id="man-title">{spec.title}</h2>

            <div className="man-brackets">
              {specs.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  className={i === index ? "is-hot" : undefined}
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => select(i)}
                >
                  [ {item.short} ]
                </button>
              ))}
            </div>

            <p className="man-flags">
              {spec.kind}
              <br />
              {spec.code} of {String(specs.length).padStart(2, "0")}
            </p>

            <ul className="man-dump" aria-live="polite">
              <li style={{ "--i": 0 } as CSSProperties}>$ ./read_spec --{spec.id}</li>
              {spec.log.map((line, i) => (
                <li key={line} style={{ "--i": i + 1 } as CSSProperties}>
                  {line}
                </li>
              ))}
              <li className="is-alert" style={{ "--i": spec.log.length + 1 } as CSSProperties}>
                % {spec.line}
              </li>
              {note ? <li className="is-cmd">{note}</li> : null}
            </ul>
          </section>

          <section className="man-pane man-pane-id" aria-label="Strengths">
            <span className="man-ticks" aria-hidden="true" />
            <p className="man-code">{spec.code}</p>
            <p className="man-verify">
              Strengths
              <strong>{spec.short}</strong>
            </p>
            <ul className="man-pros">
              {spec.pros.map((pro, i) => (
                <li key={pro} style={{ "--i": i } as CSSProperties}>
                  <i aria-hidden="true" />
                  {pro}
                </li>
              ))}
            </ul>
            <div className="man-scan">
              <img
                className="man-face"
                src={extras.image}
                alt={extras.imageAlt}
              />
            </div>
            <p className="man-bound">{extras.bound}</p>
          </section>
        </div>

        <footer className="man-foot">
          <div>
            <div className="man-imports">
              {ops.map((job, i) => (
                <button
                  key={job.name}
                  type="button"
                  className={op === i ? "is-hot" : undefined}
                  aria-current={op === i ? "true" : undefined}
                  onClick={() => {
                    setIndex(3);
                    setOp(i);
                    setNote(null);
                  }}
                >
                  &gt;&gt;&gt; {job.name}
                </button>
              ))}
            </div>
            <p className={op !== null ? "man-payload is-hot" : "man-payload"}>{payload}</p>
          </div>
          <p className="man-listen">
            <i />
            Listening…
          </p>
        </footer>
      </div>
    </div>
  );
}
