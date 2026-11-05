"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { PublicUser } from "@/lib/types";

export function LoginForm({ accounts }: { accounts: PublicUser[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("owner@brain.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Sign-in failed.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <div className="card">
        <label className="field-row">
          <span className="field-label">Email</span>
          <input className="field" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="field-row">
          <span className="field-label">Password</span>
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div style={{ height: 16 }} />
      <button className="btn btn-fill btn-wide" type="submit" disabled={pending}>
        {pending ? "Signing In" : "Continue"}
      </button>
      <h2 className="group-title" style={{ marginTop: 28 }}>
        Local accounts
      </h2>
      <div className="card">
        {accounts.map((account) => (
          <button className="row-link" type="button" key={account.id} onClick={() => setEmail(account.email)} style={{ width: "100%" }}>
            <span className="row-main">
              <span className="row-title">{account.name}</span>
              <span className="row-sub">{account.email}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="group-footer">Every local account uses the password brain-local. These accounts exist only in this installation.</p>
    </form>
  );
}
