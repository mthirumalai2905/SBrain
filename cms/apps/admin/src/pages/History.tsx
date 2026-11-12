import { useCallback, useEffect, useState } from 'react';
import { restoreVersion, versionWhen } from '../lib/versions';
import { initialsOf } from '../lib/people';
import { api, type Entry, type Site } from '../api';
import { ago } from './NotificationsBell';

interface Change { kind: string; where: string; field?: string; from?: string; to?: string }
interface Version {
  id: string; action: string; summary: string; status: string; actorName: string; source: string; createdAt: string; title: string;
  changes: Change[]; changeCount: number;
}
const LABEL: Record<string, string> = { created: 'Created', edited: 'Edited', published: 'Published', unpublished: 'Unpublished', deleted: 'Deleted', restored: 'Restored' };
const SHOWN = 3; // changes shown before "Show more"

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
/** "Today", "Yesterday", or the date */
const dayLabel = (iso: string) => {
  const diff = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

function ChangeItem({ c }: { c: Change }) {
  if (c.kind === 'add' || c.kind === 'remove') {
    return <li className="vp-ch addrem"><span className={`vp-tag ${c.kind}`}>{c.kind === 'add' ? 'Added' : 'Removed'}</span><b>{c.where}</b></li>;
  }
  const show = (v?: string) => (v ? v : <em>empty</em>);
  return (
    <li className="vp-ch">
      <div className="vp-fname"><b>{c.field ?? c.where}</b>{c.field && <span>{c.where}</span>}</div>
      <div className="vp-diff"><span className="vp-from">{show(c.from)}</span><span className="vp-arrow" aria-hidden>→</span><span className="vp-to">{show(c.to)}</span></div>
    </li>
  );
}

/** Version history of one document, in a panel on the right: who changed it, when, what changed, and a way to go back. */
export function History({ site, entryId, name, canEdit, onClose, onRestored }: {
  site: Site; entryId: string; name: string; canEdit: boolean; onClose: () => void; onRestored: (e: Entry) => void;
}) {
  const [rows, setRows] = useState<Version[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [more, setMore] = useState<Record<string, boolean>>({});
  const base = `/sites/${site.id}/entries/${entryId}/versions`;

  const load = useCallback(() => api<Version[]>(base).then(setRows).catch((e) => setErr((e as Error).message)), [base]);
  useEffect(() => { setRows(null); setErr(''); setMore({}); load(); }, [load]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.dialog.confirm')) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function restore(v: Version) {
    setErr('');
    try {
      const e = await restoreVersion(site.id, entryId, v.id, v.createdAt, v.actorName);
      if (!e) return; // they said no
      setBusy(v.id);
      onRestored(e);
      await load();
    } catch (x) { setErr((x as Error).message); }
    setBusy('');
  }

  // newest first, grouped by day
  const groups: { label: string; items: { v: Version; first: boolean }[] }[] = [];
  rows?.forEach((v, i) => {
    const label = dayLabel(v.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push({ v, first: i === 0 });
    else groups.push({ label, items: [{ v, first: i === 0 }] });
  });

  return (
    <aside className="versions-panel" aria-label="Version history">
      <header className="vp-head">
        <span className="vp-head-ico" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7.5V12l3 2" /></svg>
        </span>
        <div className="vp-head-text"><h2>Version history</h2><p>{name}</p></div>
        <button className="vp-close" onClick={onClose} aria-label="Close version history">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </header>
      <p className="vp-sub">Every save is kept. The latest 60 are shown. Hover a version to restore it.</p>
      {err && <p className="err vp-err">{err}</p>}

      <div className="vp-scroll">
        {!rows && <p className="muted pad">Loading…</p>}
        {rows && !rows.length && <p className="muted pad">No history yet. It starts with the next save.</p>}
        {groups.map((g) => (
          <section key={g.label}>
            <h3 className="vp-day">{g.label}</h3>
            <ol className="vp-timeline">
              {g.items.map(({ v, first }) => {
                const shown = more[v.id] ? v.changes : v.changes.slice(0, SHOWN);
                return (
                  <li key={v.id} className="vp-item">
                    <span className={`vp-avatar${v.source === 'ai' ? ' ai' : ''}`} aria-hidden>{v.source === 'ai' ? '✦' : initialsOf(v.actorName)}</span>
                    <div className={`vp-card${first ? ' current' : ''}`}>
                      <div className="vp-line1">
                        <b>{LABEL[v.action] ?? v.action}</b>
                        {first && <span className="status-pill on">Current</span>}
                        {v.source === 'ai' && <span className="status-pill">AI</span>}
                        <span className="vp-state">{v.status === 'PUBLISHED' ? 'Published' : 'Draft'}</span>
                        {!first && canEdit && <button className="vp-restore" disabled={!!busy} onClick={() => restore(v)}>{busy === v.id ? 'Restoring…' : 'Restore'}</button>}
                      </div>
                      <div className="vp-line2"><span>{v.actorName}</span><span aria-hidden>·</span><time title={versionWhen(v.createdAt)}>{clock(v.createdAt)}</time><span aria-hidden>·</span><span>{ago(v.createdAt)}</span></div>
                      {v.changes.length > 0 ? (
                        <>
                          <ul className="vp-changes">{shown.map((c, k) => <ChangeItem key={k} c={c} />)}</ul>
                          {v.changes.length > SHOWN && (
                            <button className="vp-more" onClick={() => setMore((m) => ({ ...m, [v.id]: !m[v.id] }))}>
                              {more[v.id] ? 'Show fewer' : `Show ${v.changes.length - SHOWN} more change${v.changes.length - SHOWN === 1 ? '' : 's'}`}
                            </button>
                          )}
                          {v.changeCount > v.changes.length && <p className="vp-small">and {v.changeCount - v.changes.length} more</p>}
                        </>
                      ) : (
                        <p className="vp-small">{v.summary || (v.action === 'created' ? 'First version' : 'Saved with no field changes')}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </aside>
  );
}
