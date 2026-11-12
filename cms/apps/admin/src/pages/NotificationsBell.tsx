import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Site } from '../api';
import { initialsOf } from '../lib/people';

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

const Info = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></svg>
);

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

  const isNew = (n: Note) => !!feed && !!seen && n.createdAt > seen && n.actorId !== feed.me;
  const unread = feed ? feed.items.filter(isNew) : [];

  function close() {
    setOpen(false);
    if (feed?.items[0]) { const latest = feed.items[0].createdAt; writeSeen(site.id, latest); setSeen(latest); }
  }

  async function setEmail(on: boolean) {
    try { await api(`/sites/${site.id}/notify`, { method: 'PUT', body: { email: on } }); setFeed((f) => (f ? { ...f, email: { ...f.email, on } } : f)); } catch { /* ignore */ }
  }

  return (
    <div className="bell" ref={box}>
      <button className={`bell-btn${open ? ' on' : ''}`} data-tip={open ? undefined : 'Notifications'} aria-label={`Notifications${unread.length ? `, ${unread.length} new` : ''}`} aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>
        {unread.length > 0 && <span className="bell-badge">{unread.length > 9 ? '9+' : unread.length}</span>}
      </button>
      {open && (
        <div className="bell-pop" role="dialog" aria-label="Notifications">
          <header className="bp-head">
            <b>Notifications</b>
            {unread.length > 0 && <span className="bp-count">{unread.length} new</span>}
            <span className="bp-site">{site.name}</span>
          </header>

          <div className="bp-body">
            {!feed?.items.length ? (
              <div className="bp-empty">
                <span className="bp-empty-ico">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>
                </span>
                <b>You are all caught up</b>
                <p>Changes made by you, your team or an AI tool will show up here.</p>
              </div>
            ) : (
              <ul className="bp-list">
                {feed.items.map((n) => (
                  <li key={n.id} className={isNew(n) ? 'new' : ''}>
                    <span className={`bp-avatar${n.source === 'ai' ? ' ai' : ''}`} aria-hidden>{n.source === 'ai' ? '✦' : initialsOf(n.actorName)}</span>
                    <div className="bp-text">
                      <p><b>{n.actorName}</b> {VERB[n.action] ?? n.action} <b>{n.title}</b></p>
                      {n.summary && <small className="bp-sum">{n.summary}</small>}
                      <small className="bp-time">{ago(n.createdAt)}</small>
                    </div>
                    {isNew(n) && <i className="bp-dot" aria-label="New" />}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="bp-foot">
            {feed?.email.on === null ? (
              <p className="bp-note"><Info />Email alerts go to site members. You are not listed as a member of this site.</p>
            ) : (
              <label className="bp-switch-row">
                <span className="bp-switch-text"><b>Email me about changes</b><small>When someone else changes something</small></span>
                <span className="bp-switch">
                  <input type="checkbox" checked={!!feed?.email.on} onChange={(e) => setEmail(e.target.checked)} />
                  <i />
                </span>
              </label>
            )}
            {feed && !feed.email.configured && <p className="bp-note"><Info />Email is not set up on the server yet, so nothing is sent for now.</p>}
          </footer>
        </div>
      )}
    </div>
  );
}
