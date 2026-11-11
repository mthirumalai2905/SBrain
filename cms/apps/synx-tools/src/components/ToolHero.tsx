"use client";

import { motion, useReducedMotion } from "framer-motion";
type Tool = { slug: string; name: string; lead: string };

const ease = [0.22, 1, 0.36, 1] as const;

const rise = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 1.15, ease } },
};

export function ToolHero({ tool, logo }: { tool: Tool; logo?: string }) {
  const mark = logo ?? `/img/${tool.slug}.png`;
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className="wrap">
        <div className="tool-lockup">
          <div className="tool-brand">
            <img className="tool-logo" src={mark} alt="" />
            <h1>{tool.name}</h1>
          </div>
          <p className="lede">{tool.lead}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="wrap"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.18, delayChildren: 0.2 } } }}
    >
      <div className="tool-lockup">
        <div className="tool-brand">
          <motion.img className="tool-logo" src={mark} alt="" variants={rise} />
          <motion.h1 variants={rise}>{tool.name}</motion.h1>
        </div>
        <motion.p className="lede" variants={rise}>{tool.lead}</motion.p>
      </div>
    </motion.div>
  );
}
