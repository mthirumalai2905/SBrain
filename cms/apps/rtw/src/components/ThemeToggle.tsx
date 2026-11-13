"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle({ light }: { light?: boolean }) {
  const { theme, switching, toggle } = useTheme();

  return (
    <button
      type="button"
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      aria-busy={switching}
      onClick={toggle}
      className={
        "theme-toggle flex h-8 w-8 items-center justify-center rounded-full border " +
        (switching ? "pointer-events-none " : "") +
        (light
          ? "border-white/20 text-white/70 hover:text-white"
          : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]")
      }
    >
      {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
