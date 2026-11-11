import { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken, type Site, type User } from './api';
import { Login } from './pages/Login';
import { Structure } from './pages/Structure';
import { LivePreview } from './pages/LivePreview';
import { Types } from './pages/Types';
import { MediaLibrary } from './pages/MediaLibrary';
import { Settings } from './pages/Settings';
import { NotificationsBell } from './pages/NotificationsBell';

type View = 'structure' | 'preview' | 'media' | 'types' | 'settings';
const MAIN: { id: View; label: string }[] = [
  { id: 'structure', label: 'Structure' },
  { id: 'preview', label: 'Live preview' },
];
// Media and Content types are not in the top bar for now (their screens still exist and can be brought back by adding them here).
const MORE: { id: View; label: string }[] = [
  { id: 'settings', label: 'Settings' },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [authOff, setAuthOff] = useState(false);
  const [down, setDown] = useState(false); // the API is not answering (for example it is restarting)
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState(localStorage.getItem('cms_site_v2') ?? '');
  const [view, setView] = useState<View>('structure');

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

  return (
    <div className="app">
      <header className="topbar">
        <strong className="brand">Synx Brain</strong>
        <select className="site-select" aria-label="Site" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          {!sites.length && <option value="">No sites</option>}
        </select>
        <nav className="tabs">
          {MAIN.map((t) => <button key={t.id} className={view === t.id ? 'on' : ''} onClick={() => setView(t.id)}>{t.label}</button>)}
        </nav>
        <div className="grow" />
        <nav className="tabs minor">
          {MORE.map((t) => <button key={t.id} className={view === t.id ? 'on' : ''} onClick={() => setView(t.id)}>{t.label}</button>)}
        </nav>
        {site && <NotificationsBell key={site.id} site={site} />}
        <span className="me">
          {user.name}
          {authOff ? <span className="muted"> · sign-in off</span> : <button className="link" onClick={() => { setToken(null); location.reload(); }}>Sign out</button>}
        </span>
      </header>

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
          <Settings user={user} site={site} sites={sites} reload={loadSites} onSelect={setSiteId} />
        )}
      </main>
    </div>
  );
}
