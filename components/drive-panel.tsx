"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { IntentChoice } from "@/lib/intents";
import type { Site } from "@/lib/types";

export function DrivePanel({
  folders,
  sites,
  intents,
  canAdd,
}: {
  folders: string[];
  sites: Site[];
  intents: IntentChoice[];
  canAdd: boolean;
}) {
  const router = useRouter();
  const [folder, setFolder] = useState(folders[0] ?? "Incoming");
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [intentId, setIntentId] = useState("");
  const [section, setSection] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [body, setBody] = useState("");
  const [folderName, setFolderName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const paths = intents.find((intent) => intent.id === intentId)?.paths.filter((path) => path.siteId === siteId) ?? [];

  function chooseSite(id: string) {
    const next = intents.find((intent) => intent.id === intentId)?.paths.filter((path) => path.siteId === id) ?? [];
    setSiteId(id);
    setSection(next[0]?.path ?? "");
  }

  function chooseIntent(id: string) {
    const next = intents.find((intent) => intent.id === id)?.paths.filter((path) => path.siteId === siteId) ?? [];
    setIntentId(id);
    setSection(next[0]?.path ?? "");
  }

  async function ingest(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const res = await fetch("/api/drive", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "ingest", folder, siteId, intentId, section, title, author, documentUrl, body }),
    });
    const data = (await res.json()) as { error?: string; articleId?: string };
    setPending(false);
    router.refresh();
    if (!res.ok) {
      setError(data.error ?? "The document was not brought in.");
      return;
    }
    if (data.articleId) router.push(`/pipeline/${data.articleId}`);
    router.refresh();
  }

  async function addFolder(event: FormEvent) {
    event.preventDefault();
    setError("");
    const res = await fetch("/api/drive", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "folder", name: folderName }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "The folder was not added.");
      return;
    }
    setFolderName("");
    router.refresh();
  }

  if (!canAdd) {
    return <p className="group-footer">Editors and owners can bring documents into the pipeline.</p>;
  }

  return (
    <div className="stack">
      <form onSubmit={ingest} className="stack">
        <div className="card">
          <label className="field-row">
            <span className="field-label">Folder</span>
            <select className="select" value={folder} onChange={(event) => setFolder(event.target.value)}>
              {folders.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field-row">
            <span className="field-label">Website</span>
            <select className="select" value={siteId} onChange={(event) => chooseSite(event.target.value)}>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </label>
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
            <input className="field" value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="From the document" />
          </label>
          <label className="field-row">
            <span className="field-label">Doc link</span>
            <input className="field" value={documentUrl} onChange={(event) => setDocumentUrl(event.target.value)} placeholder="https://" />
          </label>
        </div>
        <div className="card block-pad">
          <textarea className="textarea" value={body} placeholder="Paste the document text" onChange={(event) => setBody(event.target.value)} required />
        </div>
        {intentId && !paths.length ? <p className="error-text">This intent has no path on this website.</p> : null}
        <button className="btn btn-fill" disabled={pending || !intentId || !paths.length} type="submit" style={{ width: "max-content" }}>
          {pending ? "Sending" : "Send"}
        </button>
      </form>
      <form onSubmit={addFolder}>
        <h2 className="group-title">Watch list</h2>
        <div className="card">
          <label className="field-row">
            <span className="field-label">Folder</span>
            <input className="field" value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Name" />
          </label>
          <div className="field-row" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn-gray" type="submit">
              Add
            </button>
          </div>
        </div>
        <p className="group-footer">Folder names are kept in Brain. Google Drive is not connected, so nothing is polled on Google’s side.</p>
      </form>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
