import { useEffect, useRef, useState } from 'react';
import { ask } from '../lib/confirm';
import { api, type Media, type Site } from '../api';

export function MediaLibrary({ site, canEdit }: { site: Site; canEdit: boolean }) {
  const [items, setItems] = useState<Media[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const base = `/sites/${site.id}/media`;
  const load = () => api<Media[]>(base).then(setItems);
  useEffect(() => { load(); }, [site.id]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setErr(''); setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        await api(base, { form });
      }
      await load();
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
    if (input.current) input.current.value = '';
  }

  return (
    <div>
      <div className="head">
        <h2>Media</h2>
        {canEdit && (
          <>
            <input ref={input} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
            <button className="primary" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Uploading…' : 'Upload'}</button>
          </>
        )}
      </div>
      {err && <p className="err">{err}</p>}
      {!items.length && <p className="muted">No files yet.</p>}
      <div className="grid">
        {items.map((m) => (
          <figure key={m.id} className="card media">
            {m.mimeType.startsWith('image/') ? <img src={m.url} alt={m.originalName} /> : <div className="file">{m.mimeType.split('/')[1]}</div>}
            <figcaption>
              <span title={m.originalName}>{m.originalName}</span>
              <button className="link" onClick={() => navigator.clipboard.writeText(m.url)}>Copy URL</button>
              {canEdit && <button className="link delete-link" onClick={async () => { if (await ask({ title: 'Delete this file?', message: 'It is removed from the media library permanently.', confirmLabel: 'Delete' })) { await api(`${base}/${m.id}`, { method: 'DELETE' }); load(); } }}>Delete</button>}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
