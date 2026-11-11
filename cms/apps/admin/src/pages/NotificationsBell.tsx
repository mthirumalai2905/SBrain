import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Site } from '../api';

interface Note { id: string; entryId: string | null; action: string; title: string; summary: string; actorId: string | null; actorName: string; source: string; createdAt: string }
interface Feed { items: Note[]; me: string; email: { configured: boolean; on: boolean | null } }

const VERB: Record<string, string> = { created: 'added', edited: 'edited', published: 'published', unpublished: 'unpublished', deleted: 'deleted', restored: 'restored an older version of' };

export function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

const seenKey = (siteId: string) => `cms_notif_seen_${siteId}`;
const readSeen = (siteId: string) => { try { return localStorage.getItem(seenKey(siteId)); } catch { return null; } };
const writeSeen = (siteId: string, iso: string) => { try { localStorage.setItem(seenKey(siteId), iso); } catch { /* ignore */ } };

/** The bell in the top bar: what changed on this site, who did it, and whether to get it by email. */
export function NotificationsBell({ site }: { site: Site }) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string | null>(() => readSeen(site.id));
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const f = await api<Feed>(`/sites/${site.id}/notifications`);
      setFeed(f);
      // First time on this site: start from now, so the bell does not open with a pile of old changes marked unread.
      setSeen((cur) => { if (cur) return cur; const now = new Date().toISOString(); writeSeen(site.id, now); return now; });
    } catch { /* the API may be restarting; try again on the next tick */ }
  }, [site.id]);

  useEffect(() => {
    load();
    const refresh = () => { if (document.visibilityState === 'visible') load(); };
    const timer = setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  });

  const unreadOf = (f: Feed | null, since: string | null) => (f && since ? f.items.filter((n) => n.createdAt > since && n.actorId !== f.me) : []);
  const unread = unreadOf(feed, seen);

  function close() {
    setOpen(false);
    if (feed?.items[0]) { const latest = feed.items[0].createdAt; writeSeen(site.id, latest); setSeen(latest); }
  }

  async function setEmail(on: boolean) {
    try { await api(`/sites/${site.id}/notify`, { method: 'PUT', body: { email: on } }); setFeed((f) => (f ? { ...f, email: { ...f.email, on } } : f)); } catch { /* ignore */ }
  }

  return (
    <div className="bell" ref={box}>
      <button className={`bell-btn${open ? ' on' : ''}`} aria-label={`Notifications${unread.length ? `, ${unread.length} new` : ''}`} aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>
        {unread.length > 0 && <span className="bell-badge">{unread.length > 9 ? '9+' : unread.length}</span>}
      </button>
      {open && (
        <div className="bell-pop" role="dialog" aria-label="Recent changes">
          <div className="bell-head"><b>Recent changes</b><span className="muted">{site.name}</span></div>
          <ul className="bell-list">
            {!feed?.items.length && <li className="muted bell-empty">Nothing has changed yet. Edits made by you, your team or an AI tool show up here.</li>}
            {feed?.items.map((n) => (
              <li key={n.id} className={seen && n.createdAt > seen && n.actorId !== feed.me ? 'new' : ''}>
                <div>
                  <b>{n.actorName}</b> {VERB[n.action] ?? n.action} <b>{n.title}</b>
                  {n.source === 'ai' && <span className="status-pill on bell-ai">AI</span>}
                </div>
                {n.summary && <small className="muted">{n.summary}</small>}
                <small className="muted">{ago(n.createdAt)}</small>
              </li>
            ))}
          </ul>
          <div className="bell-foot">
            {feed?.email.on === null ? (
              <span className="muted">Email alerts go to site members. You are not listed as a member of this site.</span>
            ) : (
              <label className="check"><input type="checkbox" checked={!!feed?.email.on} onChange={(e) => setEmail(e.target.checked)} /> Email me when someone else changes something</label>
            )}
            {feed && !feed.email.configured && <span className="muted">Email is not set up on the server yet, so nothing is sent for now.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
