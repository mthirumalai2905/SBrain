import { useEffect, useRef, useState } from 'react';
import { api, type Media, type Site } from '../api';

/** Pick an image or a video from the media library, or upload a new one. */
export function MediaPicker({ site, kind = 'image', onPick, onClose }: { site: Site; kind?: 'image' | 'video'; onPick: (url: string) => void; onClose: () => void }) {
  const [items, setItems] = useState<Media[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const base = `/sites/${site.id}/media`;
  const load = () => api<Media[]>(base).then((m) => setItems(m.filter((x) => x.mimeType.startsWith(kind + '/'))));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setErr('');
    try {
      const form = new FormData();
      form.append('file', files[0]);
      const m = await api<Media>(base, { form });
      onPick(m.url);
    } catch (x) { setErr((x as Error).message); setBusy(false); }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" role="dialog" aria-label={`Choose a ${kind}`} onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <h3>Choose a {kind}</h3>
          <button className="link" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="dialog-tools">
          <input ref={input} type="file" accept={kind === 'video' ? 'video/mp4,video/webm' : 'image/png,image/jpeg,image/gif,image/webp,image/avif'} hidden onChange={(e) => upload(e.target.files)} />
          <button className="primary" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Uploading…' : `Upload new ${kind}`}</button>
          {err && <span className="err">{err}</span>}
        </div>
        <div className="grid picker-grid">
          {items.map((m) => kind === 'video'
            ? <video key={m.id} src={m.url} className="thumb pick" muted preload="metadata" title={m.originalName} onClick={() => onPick(m.url)} />
            : <img key={m.id} src={m.url} alt={m.originalName} className="thumb pick" onClick={() => onPick(m.url)} />)}
          {!items.length && <p className="muted pad">No {kind}s yet. Upload one to get started (25 MB max).</p>}
        </div>
      </div>
    </div>
  );
}
