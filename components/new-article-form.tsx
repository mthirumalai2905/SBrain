"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SendActivity, useSendWork } from "@/components/send-activity";
import type { IntentChoice } from "@/lib/intents";

export function NewArticleForm({ siteId, siteName, intents, author }: { siteId: string; siteName: string; intents: IntentChoice[]; author: string }) {
  const router = useRouter();
  const [intentId, setIntentId] = useState("");
  const [section, setSection] = useState("");
  const [title, setTitle] = useState("");
  const [articleAuthor, setArticleAuthor] = useState(author);
  const [documentUrl, setDocumentUrl] = useState("");
  const [body, setBody] = useState("");
  const work = useSendWork(siteName);
  const paths = intents.find((intent) => intent.id === intentId)?.paths.filter((path) => path.siteId === siteId) ?? [];

  function chooseIntent(id: string) {
    const next = intents.find((intent) => intent.id === id)?.paths.filter((path) => path.siteId === siteId) ?? [];
    setIntentId(id);
    setSection(next[0]?.path ?? "");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const done = await work.run("/api/changes", { siteId, intentId, section, title, author: articleAuthor, documentUrl, body });
    if (!done) return;
    if (done.articleId) router.push(`/pipeline/${done.articleId}`);
    else work.setError(done.message || "The pull request opened.");
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
        <p className="group-footer">One intent for {siteName}. This opens one pull request that edits the site code. The live site changes only after that request is merged.</p>
      </section>
      {intentId && !paths.length ? <p className="error-text">This intent has no path on this website.</p> : null}
      {work.pending || work.steps.length ? <SendActivity siteName={siteName} steps={work.steps} note={work.note} files={work.files} /> : null}
      {work.error ? <p className="error-text">{work.error}</p> : null}
      <button className="btn btn-fill" type="submit" disabled={work.pending || !intentId || !paths.length} style={{ width: "max-content" }}>
        {work.pending ? "Sending" : "Send"}
      </button>
    </form>
  );
}
