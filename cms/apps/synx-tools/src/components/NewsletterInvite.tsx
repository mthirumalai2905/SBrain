"use client";

import { FormEvent, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { rise } from "@/lib/motion";

import { mediaUrl, type Doc } from "@/lib/cms";

const FORMS = ((import.meta.env.VITE_FORMS_URL as string | undefined) ?? "").replace(/\/$/, "");

export function NewsletterInvite({ c = {} }: { c?: Doc }) {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(false);

    const response = await fetch(FORMS + "/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });

    setPending(false);
    if (!response.ok) {
      setError(true);
      return;
    }
    setSent(true);
  }

  const reduce = useReducedMotion();

  return (
    <motion.section className="invite" aria-label="Newsletter" {...(reduce ? {} : rise(0.08))}>
      <div className={`invite-stage${sent ? " sent" : ""}`}>
        <div className="invite-rays" aria-hidden="true">
          <span className="invite-beam" />
          <i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
        </div>
        <div className="invite-back" />
        <div className="invite-flap" />
        <form className="invite-letter" onSubmit={onSubmit}>
          <img src={mediaUrl(c.logo) ?? "/img/wordmark.png"} alt="Synx" />
          <h2>{c.heading ?? "Early access"}</h2>
          <p>{c.text ?? "Enter your email for early access to the newsletter."}</p>
          <label>
            {c.emailLabel ?? "Email address"}
            <input name="email" type="email" autoComplete="email" placeholder="Email address" required disabled={sent || pending} />
          </label>
          <button className="btn btn-primary" type="submit" disabled={sent || pending}>
            {pending ? "Sending" : (c.buttonLabel ?? "Join")}
          </button>
          {error ? <p className="invite-error">{c.errorMessage ?? "That could not be sent. Please try again."}</p> : null}
        </form>
        <p className="invite-stamp" role="status">{sent ? <>We&apos;ll talk<br />soon.</> : null}</p>
        <div className="invite-env" aria-hidden="true">
          <div className="invite-gusset invite-gusset-l" />
          <div className="invite-gusset invite-gusset-r" />
          <div className="invite-front" />
        </div>
      </div>
    </motion.section>
  );
}
