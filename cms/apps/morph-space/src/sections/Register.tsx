import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import HeroVideo from "../components/HeroVideo";
import { communityLinks, plans, type ContactTopic, type Period, type TopicField } from "../lib/content";
import { quote, usd, useRates } from "../lib/pricing";
import { Reveal } from "../lib/motion";

/** Contact form. A plan chosen on the pricing page arrives as ?plan=<id>&billing=monthly|yearly. */
type Status = "idle" | "sending" | "sent";

const looksLikeUrl = (v: string) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+\S*$/i.test(v);

/** Problem with an attached file, or "" if it's fine. */
function fileProblem(f: TopicField, file: File | null) {
  if (!file) return f.required ? `Attach your ${f.label.toLowerCase()}` : "";
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (f.accept && !f.accept.split(",").includes(ext)) return "Use a PDF or Word document";
  if (f.maxMb && file.size > f.maxMb * 1024 * 1024) return `Keep it under ${f.maxMb} MB`;
  return "";
}

/** File picker shown as a drop zone: click to browse, or drag a file onto it. */
function FileDrop({ f, file, error, onFile }: { f: TopicField; file: File | null; error?: string; onFile: (file: File | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (list: FileList | null) => {
    const picked = list?.[0] ?? null;
    // keep the real input in sync with dropped files so the form data includes them
    if (picked && input.current) {
      const dt = new DataTransfer();
      dt.items.add(picked);
      input.current.files = dt.files;
    }
    onFile(picked);
  };
  const clear = () => {
    if (input.current) input.current.value = "";
    onFile(null);
  };
  const labelId = `${f.name}-label`;
  return (
    <div className="field file-field">
      <span id={labelId}>
        {f.label}
        {f.required && "*"}
      </span>
      <label
        className={`drop ${over ? "over" : ""} ${file ? "has" : ""}`}
        aria-invalid={!!error}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files);
        }}
      >
        <input ref={input} type="file" name={f.name} accept={f.accept} className="sr" aria-labelledby={labelId} onChange={(e) => take(e.target.files)} />
        <svg className="drop-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {file ? <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 14l2 2 4-4" /> : <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />}
        </svg>
        <span className="drop-text">
          {file ? (
            <>
              <b>{file.name}</b> · {(file.size / 1024 / 1024).toFixed(1)} MB
            </>
          ) : (
            <>
              <b>Choose a file</b> or drag it here
            </>
          )}
        </span>
        <small>PDF or Word, up to {f.maxMb} MB</small>
      </label>
      {file && (
        <button type="button" className="drop-remove" onClick={clear}>
          Remove file
        </button>
      )}
      {error && <em>{error}</em>}
    </div>
  );
}

/** Links shown under the contact intro (used when the CMS gives none). */
const defaultLinks = [
  { title: "Plans and pricing", text: "Compare plans before you write", href: "/pricing", external: false },
  ...communityLinks.map((l) => ({ title: l.title, text: l.text, href: l.href, external: true })),
];

/**
 * The contact page: the city scene on one side (it stays put while the form scrolls) and the form as a Morph Space
 * console on the other, with the topics as tabs across its top. Sending shows a receipt.
 */
export default function Register({
  topics = [],
  title,
  intro = "Tell us what you need and we'll reply by email to help you set up your domain and your first services.",
  bgVideo,
  bgImage,
  links,
  submitLabel = "Send message",
  at = () => ({}),
}: {
  topics?: ContactTopic[];
  title?: ReactNode;
  intro?: string;
  /** Background from the CMS (see HeroVideo). */
  bgVideo?: string;
  bgImage?: string;
  /** Links under the intro, and the send button text, from the CMS. */
  links?: { title: string; text: string; href: string; external: boolean }[];
  submitLabel?: string;
  /** CMS edit markers for a field path, for click-to-edit in the CMS preview. */
  at?: (field: string) => Record<string, string>;
}) {
  const quickLinks = links?.length ? links : defaultLinks;
  useRates();
  const [status, setStatus] = useState<Status>("idle");
  const [sentTo, setSentTo] = useState("");
  const [topic, setTopic] = useState(topics[0]?.title ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  // A plan picked on the pricing page arrives as ?plan=<id>&billing=monthly|yearly
  const [plan, setPlan] = useState("");
  const [billing, setBilling] = useState<Period>("monthly");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const p = q.get("plan");
    if (p && plans.some((x) => x.id === p)) setPlan(p);
    const b = q.get("billing");
    if (b === "monthly" || b === "yearly") setBilling(b);
  }, []);
  const active = topics.find((t) => t.title === topic);
  const extra = active?.fields ?? [];
  const chosen = extra.some((f) => f.type === "plan") ? plans.find((x) => x.id === plan) : undefined;
  const amount = chosen ? quote(chosen, billing) : null;

  // switching topic clears errors from fields that may no longer be shown
  const pickTopic = (t: string) => {
    setTopic(t);
    setErrors({});
  };

  const field = (f: TopicField) =>
    f.type === "file" ? (
      <FileDrop
        key={f.name}
        f={f}
        file={files[f.name] ?? null}
        error={errors[f.name]}
        onFile={(file) => {
          setFiles((prev) => ({ ...prev, [f.name]: file }));
          setErrors((prev) => ({ ...prev, [f.name]: file ? fileProblem(f, file) : "" }));
        }}
      />
    ) : f.type === "plan" ? (
      <label className="field" key={f.name}>
        <span>{f.label}</span>
        <select name="plan" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="">Not sure yet</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    ) : (
      <label className="field" key={f.name}>
        <span>
          {f.label}
          {f.required && "*"}
        </span>
        <input
          name={f.name}
          type={f.type === "url" ? "url" : "text"}
          placeholder={f.placeholder}
          autoComplete={f.autoComplete}
          aria-invalid={!!errors[f.name]}
        />
        {errors[f.name] && <em>{errors[f.name]}</em>}
      </label>
    );

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    if (!String(d.get("first")).trim()) next.first = "Required";
    if (!String(d.get("last")).trim()) next.last = "Required";
    if (!/^\S+@\S+\.\S+$/.test(String(d.get("email")))) next.email = "Enter a valid email";
    if (!String(d.get("message")).trim()) next.message = "Required";
    for (const f of extra) {
      if (f.type === "file") {
        const problem = fileProblem(f, files[f.name] ?? null);
        if (problem) next[f.name] = problem;
        continue;
      }
      const v = String(d.get(f.name) ?? "").trim();
      if (f.required && !v) next[f.name] = "Required";
      else if (v && f.type === "url" && !looksLikeUrl(v)) next[f.name] = "Enter a valid link";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    setSentTo(String(d.get("email")));
    setStatus("sending");
    // No backend yet — simulate the request.
    setTimeout(() => setStatus("sent"), 900);
  };

  return (
    <section className="contact" id="register">
      <div className="contact-scene">
        <HeroVideo className="contact-video" video={bgVideo} image={bgImage} />
        <div className="contact-copy">
          {title}
          <Reveal delay={0.1}>
            <p className="contact-intro" {...at("intro")}>{intro}</p>
          </Reveal>
          <Reveal delay={0.2}>
            <ul className="contact-links">
              {quickLinks.map((l, i) => (
                <li key={l.title}>
                  <a href={l.href} {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}>
                    <b {...at(`links.${i}.title`)}>{l.title}</b>
                    <span {...at(`links.${i}.text`)}>{l.text}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>

      <div className="contact-panel">
        <Reveal className="contact-console" delay={0.15}>
          <div className="console contact-window">
            {status === "sent" ? (
              <div className="receipt" role="status">
                <span className="receipt-icon" aria-hidden>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7" />
                  </svg>
                </span>
                <h3>Message sent</h3>
                <p>
                  The Synx team will reply to <b>{sentTo}</b>.
                </p>
                <dl className="receipt-rows">
                  <div>
                    <dt>Topic</dt>
                    <dd>{topic}</dd>
                  </div>
                  {chosen && (
                    <div>
                      <dt>Plan</dt>
                      <dd>{chosen.name}</dd>
                    </div>
                  )}
                </dl>
                <button type="button" className="gbtn" onClick={() => setStatus("idle")}>
                  Send another
                </button>
              </div>
            ) : (
              <>
                {topics.length > 0 && (
                  <div className="contact-tabs" role="tablist" aria-label="What is this about?">
                    {topics.map((t, ti) => (
                      <button
                        key={t.title}
                        type="button"
                        role="tab"
                        aria-selected={topic === t.title}
                        className={`ctab ${topic === t.title ? "on" : ""}`}
                        onClick={() => pickTopic(t.title)}
                      >
                        <b {...at(`topics.${ti}.title`)}>{t.title}</b>
                        <span {...at(`topics.${ti}.text`)}>{t.text}</span>
                      </button>
                    ))}
                  </div>
                )}
                <form className="form" onSubmit={onSubmit} noValidate>
                  <input type="hidden" name="topic" value={topic} />
                  <div className="field-row">
                    <label className="field">
                      <span>Name*</span>
                      <input name="first" placeholder="First name" autoComplete="given-name" aria-invalid={!!errors.first} />
                      {errors.first && <em>{errors.first}</em>}
                    </label>
                    <label className="field">
                      <span className="sr">Last name</span>
                      <input name="last" placeholder="Last name" autoComplete="family-name" aria-invalid={!!errors.last} />
                      {errors.last && <em>{errors.last}</em>}
                    </label>
                  </div>
                  <label className="field">
                    <span>Email*</span>
                    <input name="email" type="email" placeholder="youremail@mail.com" autoComplete="email" aria-invalid={!!errors.email} />
                    {errors.email && <em>{errors.email}</em>}
                  </label>
                  {extra.length > 0 && (
                    <div className="topic-fields" key={topic}>
                      {extra.map(field)}
                    </div>
                  )}
                  <label className="field">
                    <span>Message*</span>
                    <textarea name="message" rows={5} placeholder={active?.message ?? "Tell us what you'd like to set up"} aria-invalid={!!errors.message} />
                    {errors.message && <em>{errors.message}</em>}
                  </label>
                  <input type="hidden" name="billing" value={billing} />
                  {chosen && amount && (
                    <p className="form-amount" aria-live="polite">
                      {amount.charge === null ? (
                        <>{chosen.name}: custom pricing, we&apos;ll send you a quote.</>
                      ) : amount.charge === 0 ? (
                        <>{chosen.name}: free.</>
                      ) : billing === "yearly" ? (
                        <>
                          {chosen.name}: <strong>{usd(amount.charge)}</strong> billed yearly ({usd(amount.perMonth!)}/mo), saving {usd(amount.yearlySaving)} a year.
                        </>
                      ) : (
                        <>
                          {chosen.name}: <strong>{usd(amount.charge)}</strong> billed monthly.
                        </>
                      )}
                    </p>
                  )}
                  <div className="form-send">
                    <button type="submit" className="gbtn gbtn-light" disabled={status === "sending"} {...at("submitLabel")}>
                      {status === "sending" ? "Sending…" : submitLabel}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
