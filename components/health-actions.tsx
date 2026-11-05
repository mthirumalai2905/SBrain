"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CheckButton({ canRun }: { canRun: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setPending(true);
    setError("");
    const res = await fetch("/api/health", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "probe" }),
    });
    const data = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "The check did not finish.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button className="btn btn-fill" type="button" disabled={!canRun || pending} onClick={run}>
        {pending ? "Checking" : "Check Now"}
      </button>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}

export function RecoveryCard({ canRun, canRetry }: { canRun: boolean; canRetry: boolean }) {
  const router = useRouter();
  const [authorised, setAuthorised] = useState(false);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function run(kind: "probe" | "retry-jobs") {
    setPending(kind);
    setError("");
    setMessage("");
    const res = await fetch("/api/health", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "recover", kind, authorised }),
    });
    const data = (await res.json()) as { error?: string; message?: string };
    setPending("");
    if (!res.ok) {
      setError(data.error ?? "Recovery did not run.");
      return;
    }
    setMessage(data.message ?? "Done.");
    router.refresh();
  }

  return (
    <section>
      <h2 className="group-title">Recovery</h2>
      <div className="card">
        <label className="switch">
          <span>
            <p>Authorise local recovery</p>
            <small>Retries Brain’s own jobs and reads the public pages again. Nginx, the VPS, and the websites are left alone.</small>
          </span>
          <span className="toggle">
            <input type="checkbox" checked={authorised} onChange={(event) => setAuthorised(event.target.checked)} />
            <i />
          </span>
        </label>
        <div className="field-row" style={{ justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-gray" type="button" disabled={!canRun || !authorised || !!pending} onClick={() => run("probe")}>
            {pending === "probe" ? "Checking" : "Check Again"}
          </button>
          <button className="btn btn-gray" type="button" disabled={!canRetry || !authorised || !!pending} onClick={() => run("retry-jobs")}>
            {pending === "retry-jobs" ? "Retrying" : "Retry Jobs"}
          </button>
        </div>
      </div>
      <p className="group-footer">Recovery runs only after the switch is on. Brain has no host agent, so it cannot restart services.</p>
      {error ? <p className="error-text">{error}</p> : null}
      {message ? <p className="ok-text">{message}</p> : null}
    </section>
  );
}
