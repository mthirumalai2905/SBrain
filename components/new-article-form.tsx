"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { IntentChoice } from "@/lib/intents";

export function NewArticleForm({ siteId, siteName, intents, author }: { siteId: string; siteName: string; intents: IntentChoice[]; author: string }) {
  const router = useRouter();
  const [intentId, setIntentId] = useState("");
  const [section, setSection] = useState("");
  const [title, setTitle] = useState("");
  const [articleAuthor, setArticleAuthor] = useState(author);
  const [documentUrl, setDocumentUrl] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const paths = intents.find((intent) => intent.id === intentId)?.paths.filter((path) => path.siteId === siteId) ?? [];

  function chooseIntent(id: string) {
    const next = intents.find((intent) => intent.id === id)?.paths.filter((path) => path.siteId === siteId) ?? [];
    setIntentId(id);
    setSection(next[0]?.path ?? "");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const res = await fetch("/api/changes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ siteId, intentId, section, title, author: articleAuthor, documentUrl, body }),
    });
    const data = (await res.json()) as { error?: string; articleId?: string | null; message?: string };
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "The change was not sent.");
      return;
    }
    if (data.articleId) router.push(`/pipeline/${data.articleId}`);
    else setError(data.message ?? "The pull request opened.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="stack">
      <div className="card">
        <label className="field-row">
          <span className="field-label">Intent</span>
          <select className="select" value={intentId} onChange={(event) => chooseIntent(event.target.value)} required>
            <option value="">Choose</option>
            {intents.map((intent) => (
              <option key={intent.id} value={intent.id}>
                {intent.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field-row">
          <span className="field-label">Path</span>
          <select className="select" value={section} onChange={(event) => setSection(event.target.value)} required={paths.length > 0} disabled={!paths.length}>
            {paths.map((path) => (
              <option key={path.path} value={path.path}>
                {path.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field-row">
          <span className="field-label">Title</span>
          <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label className="field-row">
          <span className="field-label">Author</span>
          <input className="field" value={articleAuthor} onChange={(event) => setArticleAuthor(event.target.value)} />
        </label>
        <label className="field-row">
          <span className="field-label">Document</span>
          <input className="field" value={documentUrl} placeholder="Link" onChange={(event) => setDocumentUrl(event.target.value)} />
        </label>
      </div>
      <section>
        <h2 className="group-title">Body</h2>
        <div className="card block-pad">
          <textarea className="textarea" value={body} onChange={(event) => setBody(event.target.value)} required />
        </div>
        <p className="group-footer">One intent for {siteName}. This opens one pull request. The live site is not changed.</p>
      </section>
      {intentId && !paths.length ? <p className="error-text">This intent has no path on this website.</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <button className="btn btn-fill" type="submit" disabled={pending || !intentId || !paths.length} style={{ width: "max-content" }}>
        {pending ? "Sending" : "Send"}
      </button>
    </form>
  );
}
