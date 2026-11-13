"use client";

import { useState } from "react";
import { CONTACT_TOPICS, type ContactTopic } from "@/lib/contact";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<ContactTopic>("Technical");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const response = await fetch(`${import.meta.env.VITE_FORMS_URL ?? ""}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, topic, message, company: honeypot }),
      });
      if (!response.ok) throw new Error("send failed");
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="mt-8 text-[1.05rem] leading-7 text-[var(--ink)]">
        Message received. We will reply if a response is needed.
      </p>
    );
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={onSubmit}>
      <label className="absolute left-[-9999px]" htmlFor="contact-company">
        Company
      </label>
      <input
        id="contact-company"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
        className="absolute left-[-9999px]"
      />
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
          Name
        </span>
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1.5 w-full border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-[0.95rem] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
          Email
        </span>
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1.5 w-full border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-[0.95rem] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
          Reason
        </span>
        <select
          required
          value={topic}
          onChange={(event) => setTopic(event.target.value as ContactTopic)}
          className="mt-1.5 w-full border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-[0.95rem] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
        >
          {CONTACT_TOPICS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
          Message
        </span>
        <textarea
          required
          rows={6}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="mt-1.5 w-full resize-y border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-[0.95rem] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
        />
      </label>
      {status === "error" ? (
        <p className="text-[13px] text-[var(--warn)]">Could not send. Try again in a moment.</p>
      ) : null}
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-full border border-[var(--line)] bg-[var(--accent-dim)] px-5 py-2.5 text-[0.9rem] text-[var(--ink)] disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
