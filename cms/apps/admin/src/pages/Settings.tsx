import { useEffect, useState, type ReactNode } from 'react';
import { ask } from '../lib/confirm';
import { API, api, type Member, type Role, type Site, type User } from '../api';
import { AiKeys } from './AiKeys';
import { Connectors } from './Connectors';
import { AiToolsConnect } from './AiToolsConnect';

interface Props { user: User; site?: Site; sites: Site[]; reload: () => Promise<void>; onSelect: (id: string) => void; /** Goes back to the screen Settings was opened from. */ onBack?: () => void; backLabel?: string; /** Shown in a right panel instead of a whole page. */ panel?: boolean }
type Section = 'website' | 'ai' | 'tools' | 'connect' | 'team' | 'sites';

const KEY = 'cms_settings_section';
const ICONS: Record<Section, ReactNode> = {
  website: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  ai: <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 16v4M17 18h4" /></>,
  tools: <><path d="M9 3v5M15 3v5" /><path d="M6 8h12v4a6 6 0 0 1-12 0z" /><path d="M12 18v3" /></>,
  connect: <><path d="m8 8-5 4 5 4" /><path d="m16 8 5 4-5 4" /><path d="m14 5-4 14" /></>,
  team: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.5a6 6 0 0 1 3 5.5" /></>,
  sites: <><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></>,
};
const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

/** One block of the page: a title, a plain sentence about it, then its controls. */
function Block({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="set-block">
      <header>
        <h3>{title}</h3>
        {hint && <p className="muted">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

export function Settings({ user, site, reload, onSelect, onBack, backLabel = 'Structure', panel }: Props) {
  const admin = site?.role === 'ADMIN';
  const sections: { id: Section; label: string; hint: string; show: boolean }[] = [
    { id: 'website', label: 'Website', hint: 'Name, address and preview', show: !!site && admin },
    { id: 'ai', label: 'AI assistant', hint: 'Keys and connectors', show: !!site && admin },
    { id: 'tools', label: 'Connect AI tools', hint: 'Claude, ChatGPT, Gemini, Cursor…', show: !!site && admin },
    { id: 'connect', label: 'Connect your website', hint: 'Key for your front end', show: !!site && admin },
    { id: 'team', label: 'Team', hint: 'Who can edit', show: !!site && (admin || user.isSuperAdmin) },
    { id: 'sites', label: 'All sites', hint: 'Connect AI tools, add a website', show: user.isSuperAdmin },
  ];
  const visible = sections.filter((s) => s.show);
  const [pick, setPick] = useState<Section>(() => (localStorage.getItem(KEY) as Section) || 'website');
  const current = visible.find((s) => s.id === pick) ?? visible[0];
  useEffect(() => { if (current) localStorage.setItem(KEY, current.id); }, [current?.id]);

  const [err, setErr] = useState('');
  const run = async (fn: () => Promise<unknown>) => { setErr(''); try { await fn(); } catch (x) { setErr((x as Error).message); } };

  // website
  const [name, setName] = useState('');
  const [domains, setDomains] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [saved, setSaved] = useState(false);
  // team
  const [members, setMembers] = useState<Member[]>([]);
  const [m, setM] = useState({ email: '', role: 'EDITOR' as Role });
  const [u, setU] = useState({ name: '', email: '', password: '' });
  // sites
  const [n, setN] = useState({ name: '', slug: '', domains: '' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setName(site?.name ?? '');
    setDomains(site?.domains.join(', ') ?? '');
    setPreviewUrl(site?.previewUrl ?? '');
    setSaved(false);
    if (site && admin) api<Member[]>(`/sites/${site.id}/members`).then(setMembers).catch(() => {});
  }, [site?.id]);

  const websiteChanged = !!site && (name !== site.name || domains !== site.domains.join(', ') || previewUrl !== (site.previewUrl ?? ''));

  if (!visible.length) {
    return <div className="settings"><h2>Settings</h2><p className="muted">Only a site's admins can change its settings. Ask an admin if something needs changing.</p></div>;
  }

  return (
    <div className={`settings${panel ? ' in-modal' : ''}`}>
      <header className="set-title">
        {onBack && !panel && (
          <button className="back-btn" onClick={onBack} aria-label={`Back to ${backLabel}`} data-tip={`Back to ${backLabel} (Esc)`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
          </button>
        )}
        <h2>Settings</h2>
        {site && <span className="set-site">{site.name}</span>}
        {onBack && panel && (
          <button className="vp-close set-close" onClick={onBack} aria-label="Close settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        )}
      </header>

      <div className="set-layout">
        <nav className="set-nav" aria-label="Settings sections">
          {visible.map((s) => (
            <button key={s.id} className={current?.id === s.id ? 'on' : ''} aria-current={current?.id === s.id ? 'page' : undefined} onClick={() => { setPick(s.id); setErr(''); }}>
              <span className="set-ico" aria-hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICONS[s.id]}</svg></span>
              <span className="set-txt"><b>{s.label}</b><small>{s.hint}</small></span>
            </button>
          ))}
        </nav>

        <div className="set-body">
          {err && <p className="err">{err}</p>}

          {/* ---------- Website ---------- */}
          {current?.id === 'website' && site && (
            <>
              <Block title="Website" hint="The basics. These are only for you and your team, visitors never see them.">
                <div className="set-form">
                  <label>Name <input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} /></label>
                  <label>
                    Website addresses
                    <input placeholder="yoursite.com, www.yoursite.com" value={domains} onChange={(e) => { setDomains(e.target.value); setSaved(false); }} />
                    <small className="muted">Where the finished site lives. Separate several with commas.</small>
                  </label>
                  <label>
                    Preview address
                    <input placeholder="http://localhost:5180" value={previewUrl} onChange={(e) => { setPreviewUrl(e.target.value); setSaved(false); }} />
                    <small className="muted">The copy of your site that Preview shows while you edit, for example <code>http://localhost:5180</code>.</small>
                  </label>
                </div>
                <div className="row">
                  <button className="primary" disabled={!websiteChanged || !name.trim()} onClick={() => run(async () => {
                    await api(`/sites/${site.id}`, { method: 'PATCH', body: { name: name.trim(), domains: list(domains), previewUrl } });
                    await reload();
                    setSaved(true);
                  })}>Save changes</button>
                  {saved && !websiteChanged && <span className="ok">Saved</span>}
                </div>
              </Block>
            </>
          )}

          {/* ---------- AI assistant ---------- */}
          {current?.id === 'ai' && site && (
            <>
              <Block title="AI models" hint="Add the key the AI assistant uses. It works on every site, and is stored encrypted and never shown again.">
                <AiKeys site={site} />
              </Block>
              <Block title="Connectors" hint="Extra places the assistant can read from, such as an MCP server or a REST API. Google Docs need no setup: paste the link in the chat.">
                <Connectors site={site} />
              </Block>
            </>
          )}

          {/* ---------- Connect AI tools ---------- */}
          {current?.id === 'tools' && site && (
            <Block title="Connect AI tools" hint={<>Let Claude, ChatGPT, Gemini, Cursor or any AI tool that supports MCP read and edit <b>{site.name}</b>. Each tool gets its own key, which you can show and copy any time. Want one connection for every site? Use <b>All sites</b> in the menu.</>}>
              <AiToolsConnect site={site} />
            </Block>
          )}

          {/* ---------- Connect your website ---------- */}
          {current?.id === 'connect' && site && (
            <>
              <Block title="Your website's key" hint="Your website uses this key to fetch the published content from here. Keep it private; use Rotate if it ever leaks.">
                <div className="key-line">
                  <code>{site.apiKey}</code>
                  <button onClick={async () => { try { await navigator.clipboard.writeText(site.apiKey ?? ''); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard not available */ } }}>{copied ? 'Copied' : 'Copy'}</button>
                  <button className="link delete-link always" onClick={() => run(async () => {
                    if (await ask({ title: 'Rotate the key?', message: 'The old key stops working straight away, so your website must be updated with the new one.', confirmLabel: 'Rotate key' })) {
                      await api(`/sites/${site.id}/rotate-key`, { method: 'POST', body: {} });
                      await reload();
                    }
                  })}>Rotate</button>
                </div>
              </Block>

              <Block title="Fetch your content" hint="From any website or app, ask for a page by its address.">
                <pre>{`fetch('${API}/public/pages/home', {
  headers: { 'x-api-key': 'YOUR_KEY' },
}).then((r) => r.json());
// → { title, sections: [{ _key, _type, ...fields }] }`}</pre>
              </Block>

              <Block title="Edit it live (optional)" hint="Lets you click text on your own site, inside Preview, to edit it. It does nothing for normal visitors.">
                <details>
                  <summary>Show the setup</summary>
                  <pre>{`<!-- 1. Include the script (it does nothing outside the CMS preview) -->
<script src="${API}/sdk/visual-editing.js"></script>

<!-- 2. Mark up what editors can click -->
<h1 data-synx-edit="page.title">Home</h1>
<section data-synx-key="{section._key}">
  <h2 data-synx-edit="{section._key}.heading">...</h2>
  <img data-synx-image="{section._key}.image" src="...">
  <p data-synx-edit="{section._key}.items.2.text">...</p>
</section>

<script>
// 3. Render the draft the CMS sends while editing
window.addEventListener('synx:preview', (e) => {
  const entry = e.detail.entry; // { slug, ...fields, sections: [{ _key, _type, ...fields }] }
  renderPage(entry);
});
</script>`}</pre>
                </details>
              </Block>
            </>
          )}

          {/* ---------- Team ---------- */}
          {current?.id === 'team' && site && (
            <>
              {admin && (
                <Block title="Team" hint="People who can open this site in the CMS. Editors change content, viewers can only look, admins can also change settings.">
                  <ul className="list">
                    {members.map((x) => (
                      <li key={x.userId}>
                        <div>{x.name} <span className="muted">{x.email}</span></div>
                        <div>
                          <span className="pill">{x.role.toLowerCase()}</span>
                          <button className="link delete-link always" onClick={() => run(async () => {
                            if (await ask({ title: `Remove ${x.name || x.email}?`, message: 'They lose access to this site. Their account is not deleted.', confirmLabel: 'Remove' })) {
                              await api(`/sites/${site.id}/members/${x.userId}`, { method: 'DELETE' });
                              setMembers(members.filter((y) => y.userId !== x.userId));
                            }
                          })}>Remove</button>
                        </div>
                      </li>
                    ))}
                    {!members.length && <li className="muted">No one has been added yet.</li>}
                  </ul>
                  <h4>Add someone</h4>
                  <div className="row">
                    <input placeholder="Their email (they need an account first)" value={m.email} onChange={(e) => setM({ ...m, email: e.target.value })} />
                    <select value={m.role} onChange={(e) => setM({ ...m, role: e.target.value as Role })}><option value="ADMIN">Admin</option><option value="EDITOR">Editor</option><option value="VIEWER">Viewer</option></select>
                    <button className="primary" disabled={!m.email.trim()} onClick={() => run(async () => { await api(`/sites/${site.id}/members`, { method: 'PUT', body: m }); setM({ ...m, email: '' }); setMembers(await api<Member[]>(`/sites/${site.id}/members`)); })}>Add</button>
                  </div>
                </Block>
              )}
              {user.isSuperAdmin && (
                <Block title="Create an account" hint="Make a login for someone new, then add them to a site above.">
                  <div className="row">
                    <input placeholder="Name" value={u.name} onChange={(e) => setU({ ...u, name: e.target.value })} />
                    <input placeholder="Email" value={u.email} onChange={(e) => setU({ ...u, email: e.target.value })} />
                    <input type="password" placeholder="Password (8+ characters)" value={u.password} onChange={(e) => setU({ ...u, password: e.target.value })} />
                    <button className="primary" disabled={!u.email.trim() || u.password.length < 8} onClick={() => run(async () => { await api('/auth/register', { body: u }); setU({ name: '', email: '', password: '' }); setErr(''); alert('Account created. Add them to a site under Team.'); })}>Create</button>
                  </div>
                </Block>
              )}
            </>
          )}

          {/* ---------- All sites ---------- */}
          {current?.id === 'sites' && (
            <>
            <Block title="Connect AI tools to every site" hint="One set of keys that reaches all your sites, for Claude, ChatGPT, Gemini, Cursor or any AI tool that supports MCP. The tool says which site each request is about. You can still make keys for a single site under that site's Connect AI tools.">
              <AiToolsConnect />
            </Block>
            <Block title="Add a website" hint="Each website has its own pages, media, team and AI settings, all managed from this one CMS.">
              <div className="set-form">
                <label>Name <input placeholder="My new site" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} /></label>
                <label>Short name for URLs <input placeholder="my-new-site" value={n.slug} onChange={(e) => setN({ ...n, slug: e.target.value })} /><small className="muted">Lowercase letters, digits and dashes.</small></label>
                <label>Website addresses <input placeholder="newsite.com (optional)" value={n.domains} onChange={(e) => setN({ ...n, domains: e.target.value })} /></label>
              </div>
              <div className="row">
                <button className="primary" disabled={!n.name.trim() || !n.slug.trim()} onClick={() => run(async () => {
                  const s = await api<Site>('/sites', { body: { name: n.name, slug: n.slug, domains: list(n.domains) } });
                  setN({ name: '', slug: '', domains: '' });
                  await reload(); onSelect(s.id);
                })}>Create website</button>
              </div>
            </Block>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
