import { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken, type Site, type User } from './api';
import { Login } from './pages/Login';
import { Structure } from './pages/Structure';
import { LivePreview } from './pages/LivePreview';
import { Types } from './pages/Types';
import { MediaLibrary } from './pages/MediaLibrary';
import { Settings } from './pages/Settings';
import { ProfileMenu } from './pages/ProfileMenu';
import { useAiOpen } from './lib/assistant';
import { useHistoryTarget } from './lib/versions';
import { History } from './pages/History';
import { NotificationsBell } from './pages/NotificationsBell';

type View = 'structure' | 'preview' | 'media' | 'types' | 'settings';
const MAIN: { id: View; label: string }[] = [
  { id: 'structure', label: 'Structure' },
  { id: 'preview', label: 'Preview' },
];
// Media and Content types are not in the top bar for now (their screens still exist and can be brought back by adding them here).

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [authOff, setAuthOff] = useState(false);
  const [down, setDown] = useState(false); // the API is not answering (for example it is restarting)
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState(localStorage.getItem('cms_site_v2') ?? '');
  const [view, setView] = useState<View>('structure');
  const [aiOpen, toggleAi] = useAiOpen();
  const versions = useHistoryTarget(); // the document open in Structure or Live preview, when it has been saved
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [back, setBack] = useState<View>('structure'); // where Settings goes back to: the screen you opened it from
  useEffect(() => { if (!versions) setVersionsOpen(false); }, [versions]);
  useEffect(() => {
    if (view !== 'settings' && !settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest?.('input, textarea, select');
      if (e.key === 'Escape' && !typing && !document.querySelector('.dialog')) { if (settingsOpen) setSettingsOpen(false); else setView(back); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, back, settingsOpen]); // nothing open to show the history of (for example in Settings)

  const loadSites = useCallback(async () => {
    const s = await api<Site[]>('/sites');
    setSites(s);
    setSiteId((cur) => (s.some((x) => x.id === cur) ? cur : (s.find((x) => x.previewUrl) ?? s[0])?.id ?? ''));
  }, []);

  useEffect(() => {
    // With AUTH_DISABLED on the API there is no sign-in at all. If the API is not answering yet (it restarts when the
    // server code changes), wait and try again instead of showing a sign-in form. The sign-in form is only shown when
    // the API itself says sign-in is required.
    let stopped = false;
    const start = async () => {
      try {
        const st = await api<{ authDisabled?: boolean }>('/auth/status');
        if (stopped) return;
        setAuthOff(!!st.authDisabled);
        if (st.authDisabled || getToken()) {
          const me = await api<User>('/auth/me');
          if (stopped) return;
          setUser(me);
          await loadSites();
        }
        if (stopped) return;
        setDown(false);
        setReady(true);
      } catch {
        if (stopped) return;
        setDown(true);
        setTimeout(start, 2000);
      }
    };
    start();
    return () => { stopped = true; };
  }, [loadSites]);

  useEffect(() => { localStorage.setItem('cms_site_v2', siteId); }, [siteId]);

  // Keep the site list current: refresh when you come back to this tab, and every minute while it is open.
  useEffect(() => {
    if (!user) return;
    const refresh = () => { if (document.visibilityState === 'visible') loadSites().catch(() => {}); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = setInterval(refresh, 60_000);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); clearInterval(timer); };
  }, [user, loadSites]);

  if (!ready) {
    return down ? (
      <div className="boot" role="status">
        <div className="boot-card">
          <span className="boot-spin" aria-hidden />
          <b>Waiting for the CMS server…</b>
          <p className="muted">It is starting up or restarting. This page opens by itself as soon as it answers.</p>
          <p className="muted boot-hint">If it stays here, start it with <code>npm run dev</code> in the <code>cms</code> folder.</p>
        </div>
      </div>
    ) : null;
  }
  if (!user) {
    return <Login onDone={(u) => { setUser(u); setReady(true); loadSites(); }} />;
  }

  const site = sites.find((s) => s.id === siteId);
  const canAdmin = site?.role === 'ADMIN';
  const canEdit = site?.role !== 'VIEWER';
  const workspace = view === 'structure' || view === 'preview';
  const toggleSettings = () => { if (!site) { setView(view === 'settings' ? 'structure' : 'settings'); return; } setSettingsOpen((o) => { if (!o) setVersionsOpen(false); return !o; }); };

  return (
    <div className="app">
      <header className="topbar">
        <div className="top-left">
          <strong className="brand">Synx Brain</strong>
          <select className="site-select" aria-label="Site" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            {!sites.length && <option value="">No sites</option>}
          </select>
        </div>
        <nav className="tabs">
          {MAIN.map((t) => <button key={t.id} className={view === t.id ? 'on' : ''} onClick={() => setView(t.id)}>{t.label}</button>)}
        </nav>
        <div className="top-actions">
          {site && canEdit && (
            <button className={`ai-toggle${workspace && aiOpen ? ' on' : ''}`} aria-pressed={workspace && aiOpen} disabled={!workspace} onClick={toggleAi} data-tip={workspace ? undefined : 'Open a page to use the AI assistant'}>
              <span aria-hidden>✦</span><span className="ai-label">AI assistant</span>
            </button>
          )}
          <span className="top-sep" aria-hidden />
          {site && (
            <button className={`top-icon${workspace && versionsOpen ? ' on' : ''}`} aria-label="Version history" aria-pressed={workspace && versionsOpen} disabled={!workspace || !versions} data-tip={workspace && versions ? 'Version history' : 'Open a saved page to see its version history'} onClick={() => { setSettingsOpen(false); setVersionsOpen((o) => !o); }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7.5V12l3 2" /></svg>
            </button>
          )}
          {site && <NotificationsBell key={site.id} site={site} />}
          {(
            <button className={`top-icon${view === 'settings' || settingsOpen ? ' on' : ''}`} aria-label="Settings" aria-pressed={view === 'settings' || settingsOpen} data-tip={view === 'settings' || settingsOpen ? 'Close settings' : 'Settings'} onClick={toggleSettings}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
              </svg>
            </button>
          )}
          <ProfileMenu user={user} site={site} onSignOut={() => { setToken(null); location.reload(); }} />
        </div>
      </header>
      {versionsOpen && versions && site && <History site={site} entryId={versions.entryId} name={versions.name} canEdit={versions.canEdit} onClose={() => setVersionsOpen(false)} onRestored={versions.onRestored} />}

      {settingsOpen && site && (
        <div className="settings-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}>
          <div className="settings-modal" role="dialog" aria-modal="true" aria-label="Settings">
          <Settings panel user={user} site={site} sites={sites} reload={loadSites} onSelect={setSiteId} onBack={() => setSettingsOpen(false)} />
          </div>
        </div>
      )}

      <main className={workspace ? 'full' : 'page'}>
        {!site && view !== 'settings' ? (
          <p className="muted pad">{user.isSuperAdmin ? 'Create your first site under Settings.' : 'You have no site access yet. Ask an admin.'}</p>
        ) : workspace ? (
          view === 'structure'
            ? <Structure key={site!.id} site={site!} canEdit={canEdit} goTypes={() => setView('types')} />
            : <LivePreview key={site!.id} site={site!} canEdit={canEdit} />
        ) : view === 'types' ? (
          <Types key={site!.id} site={site!} canAdmin={canAdmin} />
        ) : view === 'media' ? (
          <MediaLibrary key={site!.id} site={site!} canEdit={canEdit} />
        ) : (
          <Settings user={user} site={site} sites={sites} reload={loadSites} onSelect={setSiteId} onBack={() => setView(back)} backLabel={back === 'preview' ? 'Preview' : 'Structure'} />
        )}
      </main>
    </div>
  );
}
