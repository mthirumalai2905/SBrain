"use client";

import { useEffect, useState } from "react";
import { AuthorAvatar } from "@/components/blog/AuthorAvatar";

type Props = {
  name: string;
  image: string;
  linkedin: string;
  role?: string;
  date?: string;
};

export function AuthorByline({ name, image, linkedin, role, date }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openLinkedIn() {
    window.open(linkedin, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-10 flex w-full cursor-pointer items-center gap-4 border-b border-[var(--line)] pb-8 text-left"
      >
        <AuthorAvatar src={image} alt={name} />
        <div>
          <p className="text-[16px] text-[var(--ink)]">{name}</p>
          {role ? (
            <p className="mt-1 text-[13px] leading-6 text-[var(--muted)]">{role}</p>
          ) : null}
          {date ? (
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              {date}
            </p>
          ) : null}
        </div>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-md"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="linkedin-dialog-title"
            className="w-full max-w-md border border-[var(--line)] bg-[var(--bg)] p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <p
              id="linkedin-dialog-title"
              className="font-serif text-[1.35rem] leading-tight text-[var(--ink)]"
            >
              Open {name}&apos;s LinkedIn profile?
            </p>
            <p className="mt-3 text-[15px] leading-7 text-[var(--muted)]">
              You would leave this site and go to LinkedIn.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openLinkedIn}
                className="border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--bg)]"
              >
                Open LinkedIn
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="border border-[var(--line)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ink)]"
              >
                Stay here
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
