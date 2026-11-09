// Small animation helpers built on IntersectionObserver, scroll events and CSS transitions.
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** True once the element has scrolled into view. */
export function useInView<T extends Element>(ref: RefObject<T | null>, margin = "0px 0px -60px 0px") {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return inView;
}

/** Fades and lifts its children in when they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref);
  return (
    <Tag ref={ref} className={`reveal ${inView ? "in" : ""} ${className}`} style={{ "--d": `${delay}s` } as CSSProperties}>
      {children}
    </Tag>
  );
}

/** Headline whose words rise into place one after another. */
export function SplitHeading({
  text,
  className = "",
  dimFrom,
  as: Tag = "h2",
  delay = 0,
  edit,
}: {
  text: string;
  className?: string;
  dimFrom?: number;
  as?: "h1" | "h2";
  delay?: number;
  /** CMS edit path, for click-to-edit inside the CMS preview. */
  edit?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref);
  const words = text.split(" ");
  return (
    <Tag
      ref={ref}
      className={`split ${inView ? "in" : ""} ${className}`}
      style={{ "--d": `${delay}s` } as CSSProperties}
      aria-label={text}
      data-synx-edit={edit}
    >
      {words.map((w, i) => (
        <span className="word-mask" key={i} aria-hidden>
          <span className={dimFrom !== undefined && i >= dimFrom ? "word dim" : "word"} style={{ "--i": i } as CSSProperties}>
            {w}
          </span>
        </span>
      ))}
    </Tag>
  );
}

/** Paragraph whose words brighten one by one as it scrolls through the viewport. */
export function ScrollWords({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = text.split(" ");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spans = Array.from(el.querySelectorAll<HTMLSpanElement>("span"));
    if (reduceMotion()) {
      spans.forEach((s) => (s.style.opacity = "1"));
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the top reaches 85% of the viewport, 1 when the bottom reaches 50%
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.35 + r.height)));
      const n = spans.length;
      spans.forEach((s, i) => {
        const t = Math.min(1, Math.max(0, p * n - i));
        s.style.opacity = String(0.18 + t * 0.82);
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <p ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden style={{ opacity: 0.18 }}>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}

/** Tilts toward the cursor in 3D with a soft glare (mouse only). */
export function Tilt({ children, className = "", max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${(px - 0.5) * 2 * max}deg`);
    el.style.setProperty("--rx", `${-(py - 0.5) * 2 * max}deg`);
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
  };
  const onLeave = () => {
    ref.current!.style.setProperty("--rx", "0deg");
    ref.current!.style.setProperty("--ry", "0deg");
  };
  return (
    <div ref={ref} className={`tilt ${className}`} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
      <span className="tilt-glare" aria-hidden />
    </div>
  );
}

/** Types each word out, pauses, deletes it and moves to the next. */
export function useTypeCycle(words: string[]) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (reduceMotion()) {
      const id = setTimeout(() => setText(words[0]), 0);
      return () => clearTimeout(id);
    }
    let w = 0;
    let i = 0;
    let deleting = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const word = words[w];
      if (!deleting) {
        i++;
        setText(word.slice(0, i));
        if (i === word.length) {
          deleting = true;
          t = setTimeout(tick, 1700);
          return;
        }
        t = setTimeout(tick, 70 + Math.random() * 60);
      } else {
        i--;
        setText(word.slice(0, i));
        if (i === 0) {
          deleting = false;
          w = (w + 1) % words.length;
          t = setTimeout(tick, 320);
          return;
        }
        t = setTimeout(tick, 32);
      }
    };
    t = setTimeout(tick, 900);
    return () => clearTimeout(t);
  }, [words]);
  return text;
}

/** Card with a soft light (and lit border) that follows the cursor via --mx/--my. */
/** Card hover: spotlight position plus a gentle 3D tilt toward the cursor (mouse only). Pair with `.fx-card`. */
export function onCardMove(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
  if (e.pointerType !== "mouse" || reduceMotion()) return;
  const px = (e.clientX - r.left) / r.width - 0.5;
  const py = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty("--ry", `${px * 8}deg`);
  el.style.setProperty("--rx", `${-py * 8}deg`);
}

export function onCardLeave(e: PointerEvent<HTMLElement>) {
  e.currentTarget.style.setProperty("--rx", "0deg");
  e.currentTarget.style.setProperty("--ry", "0deg");
}

export function onSpotMove(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

/** Jump to the URL's #section once the page has rendered (the browser tries before React has drawn it). */
export function useHashScroll() {
  useEffect(() => {
    const { hash } = window.location;
    if (!hash) return;
    const id = setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: "instant" }), 60);
    return () => clearTimeout(id);
  }, []);
}
