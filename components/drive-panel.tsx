"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Site } from "@/lib/types";

export function DrivePanel({
  folders,
  sites,
  canAdd,
}: {
  folders: string[];
  sites: Site[];
  canAdd: boolean;
}) {
  const router = useRouter();
  const [folder, setFolder] = useState(folders[0] ?? "Incoming");
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [body, setBody] = useState("");
  const [folderName, setFolderName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function ingest(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const res = await fetch("/api/drive", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "ingest", folder, siteId, title, author, documentUrl, body }),
    });
    const data = (await res.json()) as { error?: string; articleId?: string };
    setPending(false);
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
            <select className="select" value={siteId} onChange={(event) => setSiteId(event.target.value)}>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
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
        <button className="btn btn-fill" disabled={pending} type="submit" style={{ width: "max-content" }}>
          {pending ? "Bringing In" : "Bring In"}
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
