/** One block of a comic page. Pages are lists of blocks. */
export type ChronicleBlock =
  | { type: "kicker"; text: string }
  | { type: "title"; text: string }
  | { type: "heading"; text: string }
  | { type: "prose"; text: string }
  | { type: "principle"; text: string }
  | { type: "plate"; src: string; alt: string; focus?: string; shape?: "square"; side?: "left" | "right" }
  | { type: "table"; heads: [string, string]; rows: [string, string][] }
  | { type: "stage"; title: string; when: string; lines: string[] }
  | { type: "credit"; text: string }
  | { type: "end"; text?: string }
  | { type: "colophon"; rows: [string, string][] }
  | { type: "epigraph"; text: string }
  | { type: "beat"; text: string }
  | { type: "screen"; text: string }
  | { type: "cast"; people: { name: string; role: string; src: string; alt: string }[] };
