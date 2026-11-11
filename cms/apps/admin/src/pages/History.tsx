import { useEffect, useState } from 'react';
import { ask } from '../lib/confirm';
import { api, type Entry, type Site } from '../api';
import { ago } from './NotificationsBell';

interface Version { id: string; action: string; summary: string; status: string; actorName: string; source: string; createdAt: string; title: string }
const LABEL: Record<string, string> = { created: 'Created', edited: 'Edited', published: 'Published', unpublished: 'Unpublished', deleted: 'Deleted', restored: 'Restored an older version' };

/** Version history of one document: who changed it and when, with a button to put an older version back. */
export function History({ site, entryId, name, canEdit, onClose, onRestored }: {
  site: Site; entryId: string; name: string; canEdit: boolean; onClose: () => void; onRestored: (e: Entry) => void;
}) {
  const [rows, setRows] = useState<Version[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const base = `/sites/${site.id}/entries/${entryId}/versions`;

  useEffect(() => { api<Version[]>(base).then(setRows).catch((e) => setErr((e as Error).message)); }, [base]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.dialog.confirm')) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function restore(v: Version) {
    const ok = await ask({
      title: 'Restore this version?',
      message: `The content goes back to how it was ${ago(v.createdAt)}. The page keeps its current status, and this restore is added to the history, so you can undo it.`,
      confirmLabel: 'Restore', tone: 'primary',
    });
    if (!ok) return;
    setBusy(v.id); setErr('');
    try {
      const e = await api<Entry>(`${base}/${v.id}/restore`, { method: 'POST' });
      onRestored(e);
      onClose();
    } catch (x) { setErr((x as Error).message); }
    setBusy('');
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog history" role="dialog" aria-label="Version history" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head"><h3>History · {name}</h3><button className="link" onClick={onClose} aria-label="Close">✕</button></header>
        <p className="muted hist-note">Every save is kept, so you can see who changed what and go back. The latest 60 are kept.</p>
        {err && <p className="err pad">{err}</p>}
        <ul className="hist-list">
          {!rows && <li className="muted pad">Loading…</li>}
          {rows && !rows.length && <li className="muted pad">No history yet. It starts with the next save.</li>}
          {rows?.map((v, i) => (
            <li key={v.id}>
              <div className="hist-main">
                <b>{LABEL[v.action] ?? v.action}</b>
                {i === 0 && <span className="status-pill on">Current</span>}
                <span className={`dot ${v.status.toLowerCase()}`} title={v.status.toLowerCase()} />
                <span className="muted">by {v.actorName}{v.source === 'ai' ? '' : ''} · {ago(v.createdAt)}</span>
                {v.summary && <small className="muted">{v.summary}</small>}
              </div>
              {canEdit && i > 0 && <button disabled={!!busy} onClick={() => restore(v)}>{busy === v.id ? 'Restoring…' : 'Restore'}</button>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
