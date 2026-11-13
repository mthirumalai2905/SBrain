import { useSyncExternalStore } from "react";

/** A tiny router: the page is chosen from the address in the browser, with no reload. */
const listeners = new Set<() => void>();
export const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("popstate", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("popstate", cb);
  };
};

export const usePathname = () => useSyncExternalStore(subscribe, () => window.location.pathname, () => "/");

export function navigate(href: string) {
  const url = new URL(href, window.location.origin);
  if (url.pathname !== window.location.pathname || url.search !== window.location.search) {
    window.history.pushState(null, "", url.pathname + url.search + url.hash);
    listeners.forEach((f) => f());
    if (!url.hash) window.scrollTo(0, 0);
  } else if (url.hash) {
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
  if (url.hash) setTimeout(() => document.querySelector(url.hash)?.scrollIntoView({ behavior: "smooth" }), 60);
}
