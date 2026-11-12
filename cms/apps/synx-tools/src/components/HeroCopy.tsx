"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { HeroTagline } from "@/lib/heroTaglines";

const ease = [0.22, 1, 0.36, 1] as const;

const rise = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease } },
};

const line = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: 0.95, ease } },
};

function heroHeadline(text: string) {
  return text.replace(/\./g, "");
}

export function HeroCopy({ tagline, editBase }: { tagline: HeroTagline; editBase?: string }) {
  // click-to-edit in the CMS preview: the path of today's tagline in the home hero section
  const mark = (field: string) => (editBase ? { "data-synx-edit": `${editBase}.${field}` } : {});
  const reduce = useReducedMotion();
  const copy = tagline;
  const lines = copy.lines.map(heroHeadline);
  const heading = lines.join(" ");

  if (reduce) {
    return (
      <div className="wrap">
        <h1 className={copy.wide ? "hero-wide" : undefined} {...mark("lineOne")}>{heading}</h1>
        <p className="lede" {...mark("text")}>{copy.text}</p>
      </div>
    );
  }

  return (
    <motion.div
      className="wrap"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } } }}
    >
      <h1 className={copy.wide ? "hero-wide" : undefined}>
        {lines.map((text, i) => (
          <span className="hero-line" key={text}>
            <motion.span variants={line} {...mark(i === 0 ? "lineOne" : "lineTwo")}>{text}</motion.span>
          </span>
        ))}
      </h1>
      <motion.p className="lede" variants={rise} {...mark("text")}>
        {copy.text}
      </motion.p>
    </motion.div>
  );
}
