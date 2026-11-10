"use client";

import { useState } from "react";
import type { WorkEvent, WorkStepId } from "@/lib/work-events";

export interface ActivityStep {
  id: WorkStepId;
  label: string;
  state: "wait" | "active" | "done";
}

const order: WorkStepId[] = ["read", "code", "patch", "pull"];

export function sendSteps(siteName: string): ActivityStep[] {
  return [
    { id: "read", label: `Reading how ${siteName} publishes this`, state: "active" },
    { id: "code", label: "Code agent is matching the existing files", state: "wait" },
    { id: "patch", label: "Patch agent is writing the change into the site", state: "wait" },
    { id: "pull", label: "Opening the pull request", state: "wait" },
  ];
}

export function applyStep(steps: ActivityStep[], id: WorkStepId, label: string, state: "active" | "done"): ActivityStep[] {
  const at = order.indexOf(id);
  return steps.map((step) => {
    const index = order.indexOf(step.id);
    if (step.id === id) return { ...step, label, state };
    if (index < at) return { ...step, state: "done" };
    if (state === "active" && step.state !== "done") return { ...step, state: "wait" };
    return step;
  });
}

export function SendActivity({ siteName, steps, note, files }: { siteName: string; steps: ActivityStep[]; note: string; files: string[] }) {
  const active = steps.find((step) => step.state === "active");
  return (
    <section className="activity" aria-live="polite">
      <div className="activity-head">
        <span className="activity-orb" aria-hidden="true" />
        <div>
          <strong>Working on {siteName}</strong>
          <p>{note || active?.label}</p>
        </div>
      </div>
      <ol className="activity-steps">
        {steps.map((step) => (
          <li key={step.id} className={`activity-step ${step.state}`}>
            <span className="activity-mark" aria-hidden="true" />
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
      {files.length ? (
        <div className="activity-files">
          <p>Files in this pull request</p>
          <ul>
            {files.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export function useSendWork(siteName: string) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState<ActivityStep[]>([]);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<string[]>([]);

  async function run(url: string, body: unknown, name = siteName) {
    setPending(true);
    setError("");
    setSteps(sendSteps(name));
    setNote("");
    setFiles([]);
    const outcome: { current: Extract<WorkEvent, { type: "done" }> | null } = { current: null };
    try {
      await postWork(url, body, (event) => {
        if (event.type === "step") setSteps((current) => applyStep(current, event.id, event.label, event.state));
        if (event.type === "note") setNote(event.text);
        if (event.type === "file" && event.action === "patch") {
          setFiles((current) => (current.includes(event.path) ? current : [...current, event.path]));
        }
        if (event.type === "error") setError(event.error);
        if (event.type === "done") outcome.current = event;
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "The change was not sent.");
    }
    setPending(false);
    return outcome.current;
  }

  return { pending, error, steps, note, files, run, setError };
}

async function postWork(url: string, body: unknown, onEvent: (event: WorkEvent) => void) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/x-ndjson, application/json" },
    body: JSON.stringify(body),
  });
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const data = (await response.json()) as { error?: string; articleId?: string | null; message?: string; url?: string };
    if (!response.ok || data.error) onEvent({ type: "error", error: data.error ?? "The change was not sent." });
    else onEvent({ type: "done", articleId: data.articleId ?? null, message: data.message ?? "", url: data.url ?? "" });
    return;
  }
  if (!response.body) {
    onEvent({ type: "error", error: "The change was not sent." });
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const take = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      onEvent(JSON.parse(trimmed) as WorkEvent);
    } catch {
      onEvent({ type: "error", error: "The progress update could not be read." });
    }
  };
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) take(line);
  }
  if (buffer.trim()) take(buffer);
}
