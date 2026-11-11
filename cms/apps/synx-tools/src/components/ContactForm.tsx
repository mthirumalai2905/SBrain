"use client";

import { FormEvent, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { rise } from "@/lib/motion";

import type { Doc } from "@/lib/cms";

const FORMS = ((import.meta.env.VITE_FORMS_URL as string | undefined) ?? "").replace(/\/$/, "");

export function ContactForm({ c = {} }: { c?: Doc }) {
  const reasons: string[] = (c.reasons ?? []).map((r: { label: string }) => r.label);
  const [reason, setReason] = useState(reasons[0] ?? "");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(false);

    const response = await fetch(FORMS + "/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: form.get("company"),
        name: form.get("name"),
        email: form.get("email"),
        reason,
        message: form.get("message"),
      }),
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
    <motion.form className="contact-form" onSubmit={onSubmit} {...(reduce ? {} : rise())}>
      <span className="tick tr" aria-hidden="true"></span>
      <span className="tick bl" aria-hidden="true"></span>
      {sent ? (
        <p className="contact-sent" role="status">
          {c.successMessage ?? "Thank you. We will get back to you as soon as possible."}
        </p>
      ) : (
        <>
          <fieldset className="contact-reasons">
            <legend>{c.reasonLegend ?? "Reason"}</legend>
            <div>
              {reasons.map((item) => (
                <label key={item} className={item === reason ? "on" : undefined}>
                  <input
                    type="radio"
                    name="reason"
                    value={item}
                    checked={item === reason}
                    onChange={() => setReason(item)}
                  />
                  {item}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="contact-fields">
            <label>
              {c.companyLabel ?? "Company"}
              <input name="company" type="text" autoComplete="organization" required />
            </label>
            <label>
              {c.nameLabel ?? "Name"}
              <input name="name" type="text" autoComplete="name" required />
            </label>
            <label className="contact-wide">
              {c.emailLabel ?? "Email"}
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label className="contact-wide">
              {c.messageLabel ?? "Message"}
              <textarea name="message" rows={6} required />
            </label>
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? "Sending" : (c.submitLabel ?? "Send")}
            </button>
            {error ? <p className="contact-error">{c.errorMessage ?? "The message could not be sent. Please try again."}</p> : null}
          </div>
        </>
      )}
    </motion.form>
  );
}
