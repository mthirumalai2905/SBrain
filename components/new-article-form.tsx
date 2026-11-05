"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Section } from "@/lib/types";

export function NewArticleForm({ siteId, siteName, sections, author }: { siteId: string; siteName: string; sections: Section[]; author: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [articleAuthor, setArticleAuthor] = useState(author);
  const [section, setSection] = useState(sections[0]?.path ?? "");
  const [documentUrl, setDocumentUrl] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ siteId, title, author: articleAuthor, section, documentUrl, body }),
    });
    const data = (await res.json()) as { error?: string; article?: { id: string } };
    setPending(false);
    if (!res.ok || !data.article) {
      setError(data.error ?? "The article was not created.");
      return;
    }
    router.push(`/pipeline/${data.article.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="stack">
      <div className="card">
        <label className="field-row">
          <span className="field-label">Title</span>
          <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label className="field-row">
          <span className="field-label">Author</span>
          <input className="field" value={articleAuthor} onChange={(event) => setArticleAuthor(event.target.value)} />
        </label>
        <label className="field-row">
          <span className="field-label">Section</span>
          <select className="select" value={section} onChange={(event) => setSection(event.target.value)}>
            {sections.map((item) => (
              <option key={item.id} value={item.path}>
                {item.label}
              </option>
            ))}
          </select>
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
        <p className="group-footer">This stays in Brain for {siteName}. It is not sent to the live site.</p>
      </section>
      {error ? <p className="error-text">{error}</p> : null}
      <button className="btn btn-fill" type="submit" disabled={pending} style={{ width: "max-content" }}>
        {pending ? "Creating" : "Create"}
      </button>
    </form>
  );
}
