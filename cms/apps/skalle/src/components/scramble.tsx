"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

type Token = { kind: "word"; chars: string[] } | { kind: "gap"; value: string };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let word = "";
  const pushWord = () => {
    if (!word) return;
    tokens.push({ kind: "word", chars: [...word] });
    word = "";
  };
  for (const char of text) {
    if (/[A-Za-z0-9]/.test(char)) word += char;
    else {
      pushWord();
      const last = tokens[tokens.length - 1];
      if (last?.kind === "gap") last.value += char;
      else tokens.push({ kind: "gap", value: char });
    }
  }
  pushWord();
  return tokens;
}

function paint(tokens: Token[], locked: number) {
  let cursor = 0;
  let out = "";
  for (const token of tokens) {
    if (token.kind === "gap") {
      out += token.value;
      continue;
    }
    const localLocked = Math.max(0, Math.min(token.chars.length, locked - cursor));
    cursor += token.chars.length;
    const tail = token.chars.slice(localLocked);
    for (let i = tail.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = tail[i];
      tail[i] = tail[j];
      tail[j] = swap;
    }
    out += token.chars.slice(0, localLocked).join("") + tail.join("");
  }
  return out;
}

const tags = { p: motion.p, span: motion.span } as const;

export function Scramble({
  text,
  className,
  as = "p",
  rise = true,
  edit,
}: {
  text: string;
  className?: string;
  as?: keyof typeof tags;
  rise?: boolean;
  /** click-to-edit path in the CMS preview, like "<section key>.lede" */
  edit?: string;
}) {
  const ref = useRef<HTMLParagraphElement & HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (!inView || reduce) return;
    const tokens = tokenize(text);
    const total = tokens.reduce((count, token) => count + (token.kind === "word" ? token.chars.length : 0), 0);
    const step = total > 220 ? 4 : 2;
    const shuffleFrames = 12;
    const last = shuffleFrames + Math.ceil(total / step);
    let frame = 0;
    const id = window.setInterval(() => {
      frame += 1;
      const locked = frame <= shuffleFrames ? 0 : Math.min(total, (frame - shuffleFrames) * step);
      setShown(frame >= last ? text : paint(tokens, locked));
      if (frame >= last) window.clearInterval(id);
    }, 32);
    return () => window.clearInterval(id);
  }, [inView, reduce, text]);

  const Tag = tags[as];

  return (
    <Tag
      ref={ref}
      className={className}
      aria-label={text}
      data-synx-edit={edit}
      initial={false}
      animate={rise && !reduce ? { opacity: 1, y: inView ? 0 : 8 } : { opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {reduce || !inView ? text : shown}
    </Tag>
  );
}
