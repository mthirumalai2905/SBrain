"use client";

import { useState, type ReactNode } from "react";

export function FeedMore({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (open) return <div className="feed-extra">{children}</div>;
  return (
    <button type="button" className="feed-read" onClick={() => setOpen(true)}>
      Read more
    </button>
  );
}
