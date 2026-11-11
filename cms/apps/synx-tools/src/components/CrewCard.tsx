"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type CrewCardProps = {
  photo: string;
  title: string;
  line: string;
  name: string;
  linkedin?: string;
  painted?: boolean;
};

export function CrewCard({ photo, title, line, name, linkedin, painted = true }: CrewCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [ask, setAsk] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!ask) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAsk(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ask]);

  return (
    <>
      <article
        className={`person${linkedin ? " can-flip" : ""}${flipped ? " is-flipped" : ""}`}
        onClick={(event) => {
          if (!linkedin) return;
          if ((event.target as HTMLElement).closest("button")) return;
          if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
          setFlipped((value) => !value);
        }}
      >
        <div className="person-inner">
          <div className="person-face person-front">
            <img className={painted ? "portrait painted" : "portrait"} src={photo} alt="" />
            <div className="person-copy">
              <h3>{title}</h3>
              <p>{line}</p>
            </div>
          </div>
          {linkedin ? (
            <div className="person-face person-back">
              <p className="person-back-kicker">LinkedIn</p>
              <h3>Connect with {name}</h3>
              <p>Open their profile and say hello.</p>
              <button type="button" onClick={() => setAsk(true)}>
                View profile
              </button>
            </div>
          ) : null}
        </div>
      </article>
      {mounted && ask && linkedin
        ? createPortal(
            <div className="crew-ask" role="dialog" aria-modal="true" aria-labelledby="crew-ask-title">
              <button type="button" className="crew-ask-shade" aria-label="Close" onClick={() => setAsk(false)} />
              <div className="crew-ask-card">
                <h3 id="crew-ask-title">Connect with {name} on LinkedIn?</h3>
                <p>This opens their profile in a new tab.</p>
                <div className="crew-ask-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      window.open(linkedin, "_blank", "noopener,noreferrer");
                      setAsk(false);
                    }}
                  >
                    Yes
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setAsk(false)}>
                    No
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
