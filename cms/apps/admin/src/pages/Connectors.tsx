import { useEffect, useState } from 'react';
import { api, type Site } from '../api';
import { ask } from '../lib/confirm';

interface Connector { id: string; kind: 'mcp' | 'api'; name: string; url: string; description: string; tokenHeader: string; allowWrites: boolean; hasToken: boolean }
interface List { items: Connector[]; fromEnv: { kind: string; name: string }[] }
interface TestResult { ok: boolean; message: string; tools?: string[] }

const blank = { kind: 'mcp' as 'mcp' | 'api', name: '', url: '', token: '', tokenHeader: '', description: '', allowWrites: false };

/** Settings card: the MCP servers and APIs the AI assistant may read from, and which AI providers have a key. */
export function Connectors({ site }: { site: Site }) {
  const base = `/sites/${site.id}/connectors`;
  const [list, setList] = useState<List>({ items: [], fromEnv: [] });
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<Connector | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [tests, setTests] = useState<Record<string, TestResult | 'running'>>({});

  const load = () => api<List>(base).then(setList).catch((x) => setErr((x as Error).message));
  useEffect(() => { load(); }, [site.id]);

  const reset = () => { setForm(blank); setEditing(null); setErr(''); };
  const edit = (c: Connector) => {
    setEditing(c);
    setForm({ kind: c.kind, name: c.name, url: c.url, token: '', tokenHeader: c.tokenHeader, description: c.description, allowWrites: c.allowWrites });
    setErr('');
  };

  async function save() {
    setErr(''); setBusy(true);
    try {
      const body = { kind: form.kind, name: form.name, url: form.url, description: form.description, tokenHeader: form.tokenHeader, allowWrites: form.allowWrites, ...(form.token ? { token: form.token } : {}) };
      if (editing) await api(`${base}/${editing.id}`, { method: 'PATCH', body });
      else await api(base, { body });
      reset();
      await load();
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }

  async function test(c: Connector) {
    setTests((t) => ({ ...t, [c.id]: 'running' }));
    try {
      const r = await api<TestResult>(`${base}/${c.id}/test`, { method: 'POST', body: {} });
      setTests((t) => ({ ...t, [c.id]: r }));
    }
    catch (x) { setTests((t) => ({ ...t, [c.id]: { ok: false, message: (x as Error).message } })); }
  }

  async function remove(c: Connector) {
    if (!(await ask({ title: `Remove "${c.name}"?`, message: 'The assistant will no longer be able to read from it. The key stored for it is deleted.', confirmLabel: 'Remove' }))) return;
    await api(`${base}/${c.id}`, { method: 'DELETE' });
    if (editing?.id === c.id) reset();
    await load();
  }

  const isMcp = form.kind === 'mcp';
  return (
    <div className="conn-wrap">
      {list.items.length > 0 && (
        <ul className="conn-list">
          {list.items.map((c) => {
            const t = tests[c.id];
            return (
              <li key={c.id} className="conn">
                <div className="conn-main">
                  <b>{c.name}</b> <span className="badge">{c.kind === 'mcp' ? 'MCP server' : 'API'}</span>
                  {c.hasToken && <span className="badge">key set</span>}
                  {c.allowWrites && <span className="badge warn">can change data</span>}
                  <div className="muted conn-url">{c.url}{c.description ? ` · ${c.description}` : ''}</div>
                  {t && t !== 'running' && <div className={t.ok ? 'ok' : 'err'}>{t.message}{t.tools?.length ? ` (${t.tools.join(', ')})` : ''}</div>}
                </div>
                <div className="conn-actions">
                  <button onClick={() => test(c)} disabled={t === 'running'}>{t === 'running' ? 'Testing…' : 'Test'}</button>
                  <button onClick={() => edit(c)}>Edit</button>
                  <button className="danger-btn" onClick={() => remove(c)}>Remove</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {list.fromEnv.length > 0 && <p className="muted">Also set for the whole install in apps/api/.env: {list.fromEnv.map((e) => `${e.name} (${e.kind === 'mcp' ? 'MCP' : 'API'})`).join(', ')}.</p>}

      {list.items.length === 0 && !editing && <p className="muted">No connectors yet.</p>}
      <h4>{editing ? `Edit ${editing.name}` : 'Add a connector'}</h4>
      <div className="conn-form">
        <label>Type
          <select value={form.kind} disabled={!!editing} onChange={(e) => setForm({ ...form, kind: e.target.value as 'mcp' | 'api' })}>
            <option value="mcp">MCP server</option>
            <option value="api">REST API (read only)</option>
          </select>
        </label>
        <label>Name <input placeholder={isMcp ? 'notes' : 'products'} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="wide">Address <input placeholder={isMcp ? 'https://example.com/mcp' : 'https://api.example.com/v1'} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></label>
        <label>Key or token <input type="password" autoComplete="off" placeholder={editing?.hasToken ? 'Leave empty to keep the saved key' : 'Optional'} value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} /></label>
        {!isMcp && <label>Key header <input placeholder="Authorization (default)" value={form.tokenHeader} onChange={(e) => setForm({ ...form, tokenHeader: e.target.value })} /></label>}
        <label className="wide">What it is <input placeholder={isMcp ? 'Optional' : 'Product catalogue (the assistant reads this to know when to use it)'} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        {isMcp && (
          <label className="wide check">
            <input type="checkbox" checked={form.allowWrites} onChange={(e) => setForm({ ...form, allowWrites: e.target.checked })} />
            Also allow tools that change data. Off by default: only tools the server marks read-only are offered.
          </label>
        )}
      </div>
      {err && <p className="err">{err}</p>}
      <div className="row">
        <button className="primary" disabled={busy || !form.name || !form.url} onClick={save}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add connector'}</button>
        {editing && <button onClick={reset}>Cancel</button>}
      </div>
    </div>
  );
}
