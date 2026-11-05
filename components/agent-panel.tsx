"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AgentRun } from "@/lib/types";
import { formatWhen } from "@/lib/format";

const prompts = [
  "Check site health",
  "What is waiting for review?",
  "Draft a journal for Real Time Web titled “Evening note”",
  "List the websites",
];

export function AgentPanel({ runs, enabled }: { runs: AgentRun[]; enabled: boolean }) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [inflight, setInflight] = useState("");
  const [error, setError] = useState("");
  const ordered = [...runs].reverse();

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [ordered.length, inflight, pending]);

  useEffect(() => {
    if (inflight && runs.some((run) => run.instruction === inflight)) setInflight("");
  }, [runs, inflight]);

  async function send(instruction: string) {
    const value = instruction.trim();
    if (!value || pending) return;
    setPending(true);
    setInflight(value);
    setError("");
    setText("");
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ instruction: value }),
    });
    const data = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setInflight("");
      setText(value);
      setError(data.error ?? "The agent did not run.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="agent-body">
      <div className="suggestions">
        {prompts.map((prompt) => (
          <button key={prompt} className="btn btn-gray" type="button" disabled={!enabled || pending} onClick={() => send(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      <div className="thread" ref={scroller}>
        {ordered.length === 0 && !inflight ? (
          <div className="thread-empty">
            <strong>No messages yet</strong>
            <p>Ask about the queue, a draft, or a health check. The reply stays in this panel.</p>
          </div>
        ) : null}
        {ordered.map((run) => (
          <div key={run.id}>
            <div className="bubble user">{run.instruction}</div>
            <p className="bubble-meta meta-right">
              {run.actor} · {formatWhen(run.at)}
            </p>
            <div className="bubble brain">{run.reply}</div>
            {run.steps.length ? (
              <div className="card steps">
                {run.steps.map((item) => (
                  <div className="row" key={item.id}>
                    <span className="row-main">
                      <span className="row-title">{item.tool.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase())}</span>
                      <span className="row-sub">{item.summary}</span>
                    </span>
                    <span className={item.ok ? "step-ok" : "step-bad"}>{item.ok ? "Done" : "Stopped"}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {inflight ? (
          <div>
            <div className="bubble user">{inflight}</div>
            <div className="bubble brain">{pending ? "Thinking…" : "Saving the reply…"}</div>
          </div>
        ) : null}
      </div>
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          void send(text);
        }}
      >
        <textarea
          value={text}
          placeholder={enabled ? "Message" : "Viewers can read the log"}
          disabled={!enabled || pending}
          rows={1}
          aria-label="Instruction"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(text);
            }
          }}
        />
        <button className="send" type="submit" disabled={!enabled || pending || !text.trim()} aria-label="Send">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 13V3M4 7l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
