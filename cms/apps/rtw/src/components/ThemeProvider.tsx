"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useLenis } from "lenis/react";

type Theme = "dark" | "light";

type ThemeContextValue = {
  theme: Theme;
  switching: boolean;
  toggle: (event?: MouseEvent<HTMLElement>) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.body.dataset.theme = theme;
  localStorage.setItem("rtw-theme", theme);
}

function setRevealOrigin(root: HTMLElement, event?: MouseEvent<HTMLElement>) {
  const box = event?.currentTarget.getBoundingClientRect();
  const x = box ? box.left + box.width / 2 : window.innerWidth / 2;
  const y = box ? box.top + box.height / 2 : 28;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  root.style.setProperty("--vt-x", `${x}px`);
  root.style.setProperty("--vt-y", `${y}px`);
  root.style.setProperty("--vt-r", `${Math.ceil(radius + 32)}px`);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [switching, setSwitching] = useState(false);
  const themeRef = useRef<Theme>("dark");
  const busyRef = useRef(false);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  useEffect(() => {
    const stored = localStorage.getItem("rtw-theme");
    const next: Theme = stored === "light" ? "light" : "dark";
    themeRef.current = next;
    setTheme(next);
    applyTheme(next);
  }, []);

  const toggle = useCallback((event?: MouseEvent<HTMLElement>) => {
    if (busyRef.current) return;

    const next: Theme = themeRef.current === "dark" ? "light" : "dark";
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scroller = lenisRef.current;
    if (scroller) scroller.scrollTo(scroller.scroll, { immediate: true });
    setRevealOrigin(root, event);

    const commit = () => {
      applyTheme(next);
      themeRef.current = next;
      setTheme(next);
    };

    const startViewTransition = document.startViewTransition?.bind(document);
    if (reduce || !startViewTransition) {
      commit();
      return;
    }

    busyRef.current = true;
    root.classList.add("theme-switching");

    try {
      const transition = startViewTransition(commit);
      setSwitching(true);
      transition.finished.finally(() => {
        root.classList.remove("theme-switching");
        busyRef.current = false;
        setSwitching(false);
      });
    } catch {
      commit();
      root.classList.remove("theme-switching");
      busyRef.current = false;
      setSwitching(false);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, switching, toggle }}>{children}</ThemeContext.Provider>
  );
}
