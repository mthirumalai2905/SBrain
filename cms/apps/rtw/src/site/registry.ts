import type { ComponentType } from "react";

/** The diagrams are drawn by this site's code. Documents and articles name the one they want ("GhostBijection"). */
const modules = import.meta.glob("../components/diagrams/*.tsx", { eager: true }) as Record<string, Record<string, unknown>>;

export const diagrams: Record<string, ComponentType> = {};
for (const mod of Object.values(modules)) {
  for (const [name, value] of Object.entries(mod)) {
    if (typeof value === "function" && /^[A-Z]/.test(name)) diagrams[name] = value as ComponentType;
  }
}
