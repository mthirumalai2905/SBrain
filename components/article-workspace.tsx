"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Article, PublicUser, Section } from "@/lib/types";
import { renderMarkdown } from "@/lib/markdown";
import { formatWhen, suggestedPath } from "@/lib/format";
import { canEdit, canRecordPublication, canReview, canRollback } from "@/lib/rbac";
import { PageHeader } from "./ui";

export function ArticleWorkspace({
  article,
  siteName,
  sections,
  user,
}: {
  article: Article;
  siteName: string;
  sections: Section[];
  user: PublicUser;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(article.title);
  const [author, setAuthor] = useState(article.author);
  const [section, setSection] = useState(article.section);
  const [documentUrl, setDocumentUrl] = useState(article.documentUrl);
  const [body, setBody] = useState(article.body);
  const [publishedUrl, setPublishedUrl] = useState(article.publishedUrl);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState("");
  const preview = useMemo(() => (body.trim() ? renderMarkdown(body) : "<p>Nothing to preview yet.</p>"), [body]);
  const editable = canEdit(user.role);

  async function call(payload: object, label: string) {
    setPending(label);
    setError("");
    setMessage("");
    const res = await fetch(`/api/articles/${article.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string; message?: string };
    setPending("");
    if (!res.ok) {
      setError(data.error ?? "That did not save.");
      return;
    }
    setMessage(data.message ?? "Saved.");
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title={article.title}
        status={article.status}
        lede={`${siteName} · ${article.author}`}
        actions={
          <>
            {canReview(user.role) && article.status === "review_required" ? (
              <button className="btn btn-text" type="button" disabled={!!pending} onClick={() => call({ action: "transition", to: "approved", note }, "approve")}>
                Approve
              </button>
            ) : null}
            {editable ? (
              <button
                className="btn btn-text"
                type="button"
                disabled={!!pending}
                onClick={() => call({ action: "save", title, body, section, author, documentUrl }, "save")}
              >
                Save
              </button>
            ) : null}
          </>
        }
      />
      <div className="editor-grid">
        <div className="stack">
          <div className="card">
            <label className="field-row">
              <span className="field-label">Title</span>
              <input className="field" value={title} disabled={!editable} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="field-row">
              <span className="field-label">Author</span>
              <input className="field" value={author} disabled={!editable} onChange={(event) => setAuthor(event.target.value)} />
            </label>
            <label className="field-row">
              <span className="field-label">Section</span>
              <select className="select" value={section} disabled={!editable} onChange={(event) => setSection(event.target.value)}>
                {sections.map((item) => (
                  <option key={item.id} value={item.path}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-row">
              <span className="field-label">Document</span>
              <input
                className="field"
                placeholder="Link"
                value={documentUrl}
                disabled={!editable}
                onChange={(event) => setDocumentUrl(event.target.value)}
              />
            </label>
          </div>
          <p className="group-footer">Suggested path {suggestedPath(section, article.slug)}. This is not a live URL.</p>
          <section>
            <h2 className="group-title">Body</h2>
            <div className="card block-pad">
              <textarea className="textarea" value={body} disabled={!editable} onChange={(event) => setBody(event.target.value)} />
            </div>
          </section>
          {canReview(user.role) && article.status === "review_required" ? (
            <section>
              <h2 className="group-title">Review</h2>
              <div className="card">
                <label className="field-row">
                  <span className="field-label">Note</span>
                  <input className="field" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" />
                </label>
                <div className="field-row" style={{ justifyContent: "flex-end" }}>
                  <button className="btn btn-gray" type="button" disabled={!!pending} onClick={() => call({ action: "transition", to: "processing", note }, "return")}>
                    Return
                  </button>
                </div>
              </div>
            </section>
          ) : null}
          {canRecordPublication(user.role) && (article.status === "approved" || article.status === "published") ? (
            <section>
              <h2 className="group-title">Publication record</h2>
              <div className="card">
                <label className="field-row">
                  <span className="field-label">Live URL</span>
                  <input className="field" value={publishedUrl} onChange={(event) => setPublishedUrl(event.target.value)} placeholder="https://" />
                </label>
                <div className="field-row" style={{ justifyContent: "flex-end" }}>
                  <button
                    className="btn btn-gray"
                    type="button"
                    disabled={!!pending}
                    onClick={() => call({ action: "transition", to: "published", publishedUrl }, "record")}
                  >
                    Record URL
                  </button>
                </div>
              </div>
              <p className="group-footer">Recording a URL does not update the website. Publish on the existing site first, then paste the address here.</p>
            </section>
          ) : null}
          {article.duplicateOf ? (
            <p className="group-footer">This matches another article already in the pipeline, so publishing stays blocked.</p>
          ) : null}
          {error ? <p className="error-text">{error}</p> : null}
          {message ? <p className="ok-text">{message}</p> : null}
        </div>
        <div className="stack">
          <section>
            <h2 className="group-title">Preview</h2>
            <div className="card preview">
              <p className="preview-kicker">Brain preview. {siteName} keeps its own layout.</p>
              <div className="prose" dangerouslySetInnerHTML={{ __html: preview }} />
            </div>
          </section>
          <section>
            <h2 className="group-title">History</h2>
            <div className="card">
              {[...article.history].reverse().map((event) => (
                <div className="row" key={event.id}>
                  <span className="row-main">
                    <span className="row-title">{event.note}</span>
                    <span className="row-sub">
                      {event.actor} · {formatWhen(event.at)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
          {article.versions.length > 1 ? (
            <section>
              <h2 className="group-title">Versions</h2>
              <div className="card">
                {[...article.versions].reverse().map((version) => (
                  <div className="row" key={version.id}>
                    <span className="row-main">
                      <span className="row-title">{version.title}</span>
                      <span className="row-sub">
                        {version.savedBy} · {formatWhen(version.savedAt)}
                      </span>
                    </span>
                    {canRollback(user.role) ? (
                      <button className="btn btn-text" type="button" disabled={!!pending} onClick={() => call({ action: "rollback", versionId: version.id }, "rollback")}>
                        Roll Back
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <p className="group-footer">Rollback changes the Brain copy only.</p>
            </section>
          ) : null}
          {article.publishedUrl ? (
            <section>
              <h2 className="group-title">Recorded URL</h2>
              <div className="card">
                <a className="row-link" href={article.publishedUrl} target="_blank" rel="noreferrer">
                  <span className="row-title">{article.publishedUrl}</span>
                </a>
              </div>
            </section>
          ) : null}
          {article.documentUrl ? (
            <section>
              <h2 className="group-title">Source document</h2>
              <div className="card">
                <a className="row-link" href={article.documentUrl} target="_blank" rel="noreferrer">
                  <span className="row-title">{article.documentUrl}</span>
                </a>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
