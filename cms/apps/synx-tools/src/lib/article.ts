export type MarkKind = "em" | "strong" | "u" | "gloss";

export type Mark = { find: string; kind: MarkKind; hint?: string; title?: string };

export type ArticleBlock =
  | { type: "p"; text: string; tone?: "ask" | "cue" | "say" | "voice" | "sign"; marks?: Mark[] }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "figure"; src: string; alt: string }
  | { type: "note"; side: "left" | "right"; lines: readonly [string, string] };
