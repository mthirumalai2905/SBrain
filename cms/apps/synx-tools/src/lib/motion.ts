export const ease = [0.22, 1, 0.36, 1] as const;

export const view = { once: true, margin: "0px 0px -48px 0px" } as const;

export function rise(delay = 0) {
  return {
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: view,
    transition: { duration: 0.7, ease, delay },
  };
}

export function fade(delay = 0) {
  return {
    initial: { opacity: 0, scale: 0.97 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: view,
    transition: { duration: 0.85, ease, delay },
  };
}
