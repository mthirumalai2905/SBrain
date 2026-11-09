import { useEffect, useState, type ReactNode } from 'react';
import { ask } from '../lib/confirm';
import { API, api, type Member, type Role, type Site, type User } from '../api';
import { AiKeys } from './AiKeys';
import { Connectors } from './Connectors';

interface Props { user: User; site?: Site; sites: Site[]; reload: () => Promise<void>; onSelect: (id: string) => void }
type Section = 'website' | 'ai' | 'connect' | 'team' | 'sites';

const KEY = 'cms_settings_section';
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

export function Settings({ user, site, reload, onSelect }: Props) {
  const admin = site?.role === 'ADMIN';
  const sections: { id: Section; label: string; hint: string; show: boolean }[] = [
    { id: 'website', label: 'Website', hint: 'Name, address and preview', show: !!site && admin },
    { id: 'ai', label: 'AI assistant', hint: 'Keys and connectors', show: !!site && admin },
    { id: 'connect', label: 'Connect your website', hint: 'Key for your front end', show: !!site && admin },
    { id: 'team', label: 'Team', hint: 'Who can edit', show: !!site && (admin || user.isSuperAdmin) },
    { id: 'sites', label: 'All sites', hint: 'Add a new website', show: user.isSuperAdmin },
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
    <div className="settings">
      <header className="set-title">
        <h2>Settings</h2>
        {site && <p className="muted">for <b>{site.name}</b></p>}
      </header>

      <div className="set-layout">
        <nav className="set-nav" aria-label="Settings sections">
          {visible.map((s) => (
            <button key={s.id} className={current?.id === s.id ? 'on' : ''} aria-current={current?.id === s.id ? 'page' : undefined} onClick={() => { setPick(s.id); setErr(''); }}>
              <b>{s.label}</b>
              <small>{s.hint}</small>
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
                    <small className="muted">The copy of your site that Live preview shows while you edit, for example <code>http://localhost:5180</code>.</small>
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
              <Block title="AI models" hint="Add a key for each AI you want to use. The assistant in the editor lets you pick between them. Keys are stored encrypted and are never shown again.">
                <AiKeys site={site} />
              </Block>
              <Block title="Connectors" hint="Extra places the assistant can read from, such as an MCP server or a REST API. Google Docs need no setup: paste the link in the chat.">
                <Connectors site={site} />
              </Block>
            </>
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

              <Block title="Edit it live (optional)" hint="Lets you click text on your own site, inside Live preview, to edit it. It does nothing for normal visitors.">
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
          )}
        </div>
      </div>
    </div>
  );
}
