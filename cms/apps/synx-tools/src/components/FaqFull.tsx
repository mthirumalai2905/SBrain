"use client";

import { useId, useState } from "react";

export type FaqPiece = string | { heading: string } | { items: readonly string[] };

export function FaqFull({ pieces }: { pieces: readonly FaqPiece[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <>
      <button
        type="button"
        className="faq-more"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Hide full answer" : "View full answer"}
      </button>
      <div id={panelId} hidden={!open}>
        {pieces.map((piece, index) => {
          if (typeof piece === "string") return <p key={index}>{piece}</p>;
          if ("heading" in piece) {
            return (
              <p className="faq-label" key={index}>
                {piece.heading}
              </p>
            );
          }
          return (
            <ul className="faq-list" key={index}>
              {piece.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        })}
      </div>
    </>
  );
}
