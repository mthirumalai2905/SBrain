import { useEffect, useState } from 'react';
import { api, type Site } from '../api';
import { ask } from '../lib/confirm';

type Perm = 'read' | 'draft' | 'publish';
interface KeyRow { id: string; tool: string; label: string; perm: Perm; last4: string; createdAt: string; canShow: boolean }
interface Listing { items: KeyRow[]; address: string; tools: Record<string, string> }

const PUBLIC_KEY = 'cms_public_address';
const PERMS: { id: Perm; title: string; text: string }[] = [
  { id: 'draft', title: 'Read and save drafts', text: 'The AI can read your pages, create draft pages and edit drafts. It can never publish or touch a live page.' },
  { id: 'publish', title: 'Read, save drafts and publish', text: 'It can also change live pages and publish, but only after it has shown you exactly what will change and you have said yes in that AI tool.' },
  { id: 'read', title: 'Read only', text: 'The AI can look at your content and answer questions. It changes nothing.' },
];
const permName = (p: Perm) => (p === 'read' ? 'read only' : p === 'publish' ? 'can publish (asks you first)' : 'drafts only');
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

interface Ctx { name: string; id: string; key: string; local: string; url: string; hasPublic: boolean }
interface Guide { form?: boolean; steps: string[]; blocks: { label: string; text: string }[] }
const json = (v: unknown) => JSON.stringify(v, null, 2);
const bearer = (k: string) => `Bearer ${k}`;

/** What each AI tool needs, with this key filled in. Menu names and file formats are the apps' own and can change: check the app's MCP help if a step differs. */
const guides: Record<string, (c: Ctx) => Guide> = {
  claude: (c) => ({
    form: true,
    steps: [
      'In Claude, open Settings › Connectors, then choose Add custom connector.',
      'Paste the Name and the MCP server URL from below, then press Continue.',
      'Leave any advanced sign-in options empty. The key is already inside the address.',
    ],
    blocks: [{
      label: 'Claude Desktop on this computer, without a public address (add to claude_desktop_config.json, then restart Claude)',
      text: json({ mcpServers: { [c.id]: { command: 'npx', args: ['-y', 'mcp-remote', c.local, '--header', 'Authorization:${AUTH_HEADER}'], env: { AUTH_HEADER: bearer(c.key) } } } }),
    }],
  }),
  chatgpt: () => ({
    form: true,
    steps: [
      'In ChatGPT, open Settings › Connectors and turn on Developer mode (under Advanced), then create a new connector.',
      'Paste the Name and the MCP server URL from below.',
      'Choose "No authentication". The key is already inside the address.',
    ],
    blocks: [],
  }),
  'claude-code': (c) => ({ steps: ['Run this in a terminal:'], blocks: [{ label: 'Terminal', text: `claude mcp add --transport http ${c.id} ${c.local} --header "Authorization: ${bearer(c.key)}"` }] }),
  codex: (c) => ({
    steps: ['Set the key as an environment variable, then add the server to Codex\'s config:'],
    blocks: [
      { label: 'Terminal (PowerShell: $env:SYNX_BRAIN_KEY = "…")', text: `export SYNX_BRAIN_KEY="${c.key}"` },
      { label: '~/.codex/config.toml', text: `[mcp_servers.${c.id}]\nurl = "${c.local}"\nbearer_token_env_var = "SYNX_BRAIN_KEY"` },
    ],
  }),
  gemini: (c) => ({ steps: ['Add this to ~/.gemini/settings.json, then restart Gemini CLI:'], blocks: [{ label: '~/.gemini/settings.json', text: json({ mcpServers: { [c.id]: { httpUrl: c.local, headers: { Authorization: bearer(c.key) } } } }) }] }),
  cursor: (c) => ({ steps: ['Add this to ~/.cursor/mcp.json (or Settings › MCP), then reload Cursor:'], blocks: [{ label: '~/.cursor/mcp.json', text: json({ mcpServers: { [c.id]: { url: c.local, headers: { Authorization: bearer(c.key) } } } }) }] }),
  vscode: (c) => ({ steps: ['Add this to .vscode/mcp.json in your project (or run "MCP: Add Server"):'], blocks: [{ label: '.vscode/mcp.json', text: json({ servers: { [c.id]: { type: 'http', url: c.local, headers: { Authorization: bearer(c.key) } } } }) }] }),
  windsurf: (c) => ({ steps: ['Add this to ~/.codeium/windsurf/mcp_config.json, then refresh Windsurf:'], blocks: [{ label: 'mcp_config.json', text: json({ mcpServers: { [c.id]: { serverUrl: c.local, headers: { Authorization: bearer(c.key) } } } }) }] }),
  other: (c) => ({
    steps: ['Any tool that supports MCP over HTTP can use these details:'],
    blocks: [{ label: 'Details', text: `Server URL (this computer): ${c.local}\nServer URL (apps that only take a URL): ${c.url}\nTransport: Streamable HTTP\nHeader: Authorization: ${bearer(c.key)}` }],
  }),
};

/** A block of text with a Copy button. */
function Copy({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="copy-block">
      <div className="copy-head">
        <b>{label}</b>
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard not available */ } }}>{done ? 'Copied' : 'Copy'}</button>
      </div>
      <pre>{text}</pre>
    </div>
  );
}

/** One detail an app asks for (a name, a URL), with its own Copy button. */
function Field({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="tk-field">
      <span>{label}</span>
      <code>{value}</code>
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard not available */ } }}>{done ? 'Copied' : 'Copy'}</button>
    </div>
  );
}

/**
 * Settings › Connect AI tools. One key per AI tool (Claude, ChatGPT, Gemini CLI, Cursor...), each of which can be shown and
 * copied, with the exact details that tool asks for. With no `site` it manages the keys that reach every site.
 */
export function AiToolsConnect({ site }: { site?: Site }) {
  const base = site ? `/sites/${site.id}/mcp-keys` : '/mcp-keys';
  const [list, setList] = useState<Listing | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({}); // keys fetched so far
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [tool, setTool] = useState('claude');
  const [perm, setPerm] = useState<Perm>('draft');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [pub, setPub] = useState(() => { try { return localStorage.getItem(PUBLIC_KEY) ?? ''; } catch { return ''; } });

  const load = () => api<Listing>(base).then(setList).catch((x) => setErr((x as Error).message));
  useEffect(() => { setKeys({}); setVisible({}); setOpen(null); load(); }, [site?.id]);
  useEffect(() => { try { localStorage.setItem(PUBLIC_KEY, pub); } catch { /* ignore */ } }, [pub]);

  const publicBase = pub.trim().replace(/\/+$/, '');
  const publicOk = /^https:\/\/[^\s/]+/.test(publicBase);
  const name = site ? `Synx Brain: ${site.name}` : 'Synx Brain (all sites)';
  const id = site ? `synx-${slug(site.name)}` : 'synx-brain';

  async function fetchKey(r: KeyRow): Promise<string | undefined> {
    if (keys[r.id]) return keys[r.id];
    if (!r.canShow) return undefined;
    try { const k = (await api<{ key: string }>(`${base}/${r.id}/key`)).key; setKeys((m) => ({ ...m, [r.id]: k })); return k; }
    catch (x) { setErr((x as Error).message); return undefined; }
  }
  async function create() {
    setBusy(true); setErr('');
    try {
      const r = await api<KeyRow & { key: string }>(base, { body: { tool, perm } });
      setKeys((m) => ({ ...m, [r.id]: r.key }));
      setVisible((m) => ({ ...m, [r.id]: true }));
      setOpen(r.id);
      await load();
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }
  async function remove(r: KeyRow) {
    if (!(await ask({ title: `Remove the ${r.label} key?`, message: 'That AI tool stops working with the CMS straight away. The other tools are not affected.', confirmLabel: 'Remove key' }))) return;
    await api(`${base}/${r.id}`, { method: 'DELETE' });
    await load();
  }
  async function changePerm(r: KeyRow, p: Perm) {
    await api(`${base}/${r.id}`, { method: 'PATCH', body: { perm: p } });
    await load();
  }
  async function toggle(r: KeyRow) {
    if (!visible[r.id]) await fetchKey(r);
    setVisible((m) => ({ ...m, [r.id]: !m[r.id] }));
  }
  async function toggleSetup(r: KeyRow) {
    if (open === r.id) { setOpen(null); return; }
    await fetchKey(r);
    setOpen(r.id);
  }

  const local = list?.address ?? 'http://localhost:4000/mcp';
  const toolName = (t: string) => list?.tools[t] ?? t;

  return (
    <div className="ai-tools">
      {err && <p className="err">{err}</p>}
      {!site && <p className="muted">These keys reach every site. The AI tool says which site each request is about, so one key works for Morph Space, Synx Tools, RTW and Skalle.</p>}

      <div className="tk-public">
        <label>
          <b>Public address of this CMS</b> <span className="muted">(only for apps that connect from the internet, such as Claude's “Add custom connector” and ChatGPT)</span>
          <input placeholder="https://your-name.trycloudflare.com" value={pub} onChange={(e) => setPub(e.target.value)} spellCheck={false} />
        </label>
        {pub && !publicOk && <p className="err">It must start with https://</p>}
        <details>
          <summary>How do I get one?</summary>
          <p className="muted">Those apps cannot reach <code>localhost</code>. Open a tunnel to the small MCP-only door (it shows nothing but the MCP address, so the rest of the CMS stays private), then paste the https address it prints above:</p>
          <pre>{`npm run mcp:public                                   # in the cms folder: starts the door on port 4010
cloudflared tunnel --url http://localhost:4010       # or: ngrok http 4010`}</pre>
          <p className="muted">Do not point a tunnel at port 4000 while sign-in is off: that would open the whole CMS to the internet.</p>
        </details>
      </div>

      <h4>Keys</h4>
      {list && list.items.length === 0 && <p className="muted">No keys yet. Add one for each AI tool you use, below.</p>}
      <ul className="tk-list">
        {list?.items.map((r) => {
          const key = keys[r.id];
          const shown = visible[r.id] && key;
          const g = open === r.id ? guides[r.tool] ?? guides.other : null;
          const ctx: Ctx = { name, id, key: key ?? 'YOUR_KEY', local, url: `${publicOk ? publicBase : 'https://YOUR-PUBLIC-ADDRESS'}/mcp/k/${key ?? 'YOUR_KEY'}`, hasPublic: publicOk };
          const guide = g ? g(ctx) : null;
          return (
            <li key={r.id} className="tk">
              <div className="tk-head">
                <b>{r.label}</b>
                {r.label !== toolName(r.tool) && <span className="status-pill on">{toolName(r.tool)}</span>}
                <span className="grow" />
                <select aria-label="What this key may do" value={r.perm} onChange={(e) => changePerm(r, e.target.value as Perm)}>
                  {PERMS.map((p) => <option key={p.id} value={p.id}>{permName(p.id)}</option>)}
                </select>
                <button type="button" onClick={() => toggleSetup(r)}>{open === r.id ? 'Hide setup' : 'Setup'}</button>
                <button type="button" className="link delete-link always" onClick={() => remove(r)}>Remove</button>
              </div>
              <div className="key-line">
                <code>{shown ? key : r.canShow ? `synxmcp_${site ? '' : 'all_'}••••••••••${r.last4}` : `••••••••${r.last4}`}</code>
                {r.canShow ? (
                  <>
                    <button type="button" onClick={() => toggle(r)}>{visible[r.id] ? 'Hide' : 'Show'}</button>
                    <button type="button" onClick={async () => { const k = await fetchKey(r); if (k) { try { await navigator.clipboard.writeText(k); } catch { /* clipboard not available */ } } }}>Copy</button>
                  </>
                ) : <span className="muted">Made before keys could be shown. Remove it and add a new one to see it.</span>}
              </div>

              {guide && (
                <div className="tk-setup">
                  {guide.form && (
                    <>
                      <p><b>Details this app asks for</b></p>
                      <div className="tk-details">
                        <Field label="Name" value={name} />
                        <Field label="MCP server URL" value={ctx.url} />
                      </div>
                      {!publicOk && <p className="cc-warn" role="note">This app needs a <b>public https address</b>, and this CMS is on your computer. Add the public address at the top of this section first (see “How do I get one?”). The URL above then fills in by itself.</p>}
                      <p className="muted">The key is part of this address, so treat the address like a password and do not share it.</p>
                    </>
                  )}
                  <ol className="tk-steps">{guide.steps.map((st, i) => <li key={i}>{st}</li>)}</ol>
                  {guide.blocks.map((b) => <Copy key={b.label} label={b.label} text={b.text} />)}
                  {r.perm === 'publish' && (
                    <p className="cc-warn" role="note">
                      <b>Publishing is confirmed in the AI tool.</b> It first shows you what will change and asks. Then the tool shows its own Allow / Deny button. Do not choose “Always allow” for <code>publish_page</code> or <code>update_live_page</code>.
                    </p>
                  )}
                  <p className="muted">Menu names and file formats belong to each app and can change. If a step looks different, use the app's own MCP help with the address and key above.</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <h4>Add a key for another AI tool</h4>
      <div className="tk-add">
        <label>
          AI tool
          <select value={tool} onChange={(e) => setTool(e.target.value)}>
            {Object.entries(list?.tools ?? { claude: 'Claude' }).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      <div className="cc-perm" role="radiogroup" aria-label="What this key may do">
        {PERMS.map((p) => (
          <label key={p.id} className={perm === p.id ? 'on' : ''}>
            <input type="radio" name={`perm-${site?.id ?? 'all'}`} checked={perm === p.id} onChange={() => setPerm(p.id)} />
            <span><b>{p.title}</b><small>{p.text}</small></span>
          </label>
        ))}
      </div>
      <div className="row"><button className="primary" disabled={busy} onClick={create}>{busy ? 'Adding…' : 'Add key'}</button></div>
    </div>
  );
}
