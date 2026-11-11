"use client";

import { useEffect, useRef, useState } from "react";

const SRC = "/audio/flow.mp3";
const KEY = "synx-flow";
const LEVEL = 0.3;

export function FlowMusic() {
  const audio = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);
  const [quiet, setQuiet] = useState(false);

  useEffect(() => {
    if (window.name === "synx-post") {
      setQuiet(true);
      return;
    }
    const node = audio.current;
    if (!node) return;
    const savedOn = window.localStorage.getItem(KEY) === "on";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!savedOn || reduce) return;

    let alive = true;
    node.volume = LEVEL;
    node.preload = "auto";

    const start = () => {
      if (!alive) return;
      if (window.localStorage.getItem(KEY) !== "on") return;
      node.volume = LEVEL;
      const pending = node.play();
      pending
        .then(() => {
          if (!alive || window.localStorage.getItem(KEY) !== "on") {
            node.pause();
            setOn(false);
            return;
          }
          setOn(true);
          window.removeEventListener("pointerdown", unlock, true);
          window.removeEventListener("keydown", unlock, true);
        })
        .catch(() => {
          if (alive && node.paused) setOn(false);
        });
    };

    const unlock = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".flow-music")) return;
      start();
    };

    start();
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    return () => {
      alive = false;
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, []);

  function toggle() {
    const node = audio.current;
    if (!node) return;
    if (!node.paused) {
      node.pause();
      setOn(false);
      window.localStorage.setItem(KEY, "off");
      return;
    }
    node.volume = LEVEL;
    node.play()
      .then(() => {
        setOn(true);
        window.localStorage.setItem(KEY, "on");
      })
      .catch(() => setOn(false));
  }

  if (quiet) return null;

  return (
    <div className="flow-music">
      <audio ref={audio} src={SRC} loop preload="none" />
      <button
        type="button"
        className={on ? "on" : undefined}
        aria-pressed={on}
        aria-label={on ? "Pause background music" : "Play background music"}
        onClick={toggle}
      >
        <span className="flow-bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        Sound
      </button>
    </div>
  );
}
