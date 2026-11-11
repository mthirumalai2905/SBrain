"use client";

import { useEffect } from "react";

export function SiteEffects() {
  useEffect(() => {
    const cards = [...document.querySelectorAll<HTMLElement>(".bento .card")];
    const onMove = (event: Event) => {
      const mouse = event as MouseEvent;
      const card = mouse.currentTarget as HTMLElement;
      const box = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${mouse.clientX - box.left}px`);
      card.style.setProperty("--my", `${mouse.clientY - box.top}px`);
    };
    cards.forEach((card) => card.addEventListener("mousemove", onMove));

    const onToggle = (event: Event) => {
      const item = event.target;
      if (!(item instanceof HTMLDetailsElement) || !item.open || !item.closest(".faq")) return;
      item.parentElement?.querySelectorAll("details").forEach((other) => {
        if (other !== item) other.open = false;
      });
    };
    document.addEventListener("toggle", onToggle, true);

    if (location.hash) {
      document.querySelector(location.hash)?.scrollIntoView();
    }

    return () => {
      cards.forEach((card) => card.removeEventListener("mousemove", onMove));
      document.removeEventListener("toggle", onToggle, true);
    };
  }, []);

  return null;
}
