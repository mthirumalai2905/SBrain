"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Scramble } from "./scramble";

export function FaqList({
  items,
  openLabel = "Read the full answer",
  closeLabel = "Close",
}: {
  items: ReadonlyArray<{ q: string; summary: string; full: string }>;
  openLabel?: string;
  closeLabel?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="lab-faq">
      {items.map((item, index) => {
        const expanded = open === index;
        return (
          <article key={item.q} className={expanded ? "is-open" : undefined}>
            <header>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.q}</h3>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : index)}
              >
                {expanded ? closeLabel : openLabel}
              </button>
            </header>
            <Scramble text={item.summary} />
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  key="full"
                  className="lab-faq-full"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p>{item.full}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </article>
        );
      })}
    </div>
  );
}
