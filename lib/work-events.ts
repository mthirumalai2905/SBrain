export type WorkStepId = "read" | "code" | "patch" | "pull";

export type WorkEvent =
  | { type: "step"; id: WorkStepId; label: string; state: "active" | "done" }
  | { type: "note"; text: string }
  | { type: "file"; path: string; action: "read" | "patch" }
  | { type: "done"; articleId: string | null; message: string; url: string }
  | { type: "error"; error: string };
