import { useEffect, useState } from 'react';
import { api, type Site } from '../api';
import { ask } from '../lib/confirm';

interface KeyInfo {
  provider: 'anthropic' | 'openai' | 'gemini'; label: string; source: 'settings' | 'env' | 'none';
  hint?: string; model: string; defaultModel: string; keyEnv: string; modelCustom: boolean;
}
interface Result { ok: boolean; message: string }

const getKey: Record<KeyInfo['provider'], { host: string; url: string }> = {
  anthropic: { host: 'console.anthropic.com', url: 'https://console.anthropic.com/settings/keys' },
  openai: { host: 'platform.openai.com', url: 'https://platform.openai.com/api-keys' },
  gemini: { host: 'aistudio.google.com', url: 'https://aistudio.google.com/apikey' },
};

/** One AI company: its key (kept encrypted on the server), the model to use, and a Test button. */
function KeyCard({ site, info, onChange }: { site: Site; info: KeyInfo; onChange: () => Promise<void> }) {
  const base = `/sites/${site.id}/ai-keys/${info.provider}`;
  const [key, setKey] = useState('');
  const [model, setModel] = useState(info.modelCustom ? info.model : '');
  const [busy, setBusy] = useState<'save' | 'test' | ''>('');
  const [result, setResult] = useState<Result | null>(null);
  const changed = !!key || model !== (info.modelCustom ? info.model : '');

  async function save() {
    setBusy('save'); setResult(null);
    try {
      await api(base, { method: 'PUT', body: { ...(key ? { key } : {}), model } });
      setKey('');
      await onChange();
      setResult({ ok: true, message: 'Saved.' });
    } catch (x) { setResult({ ok: false, message: (x as Error).message }); }
    setBusy('');
  }
  async function test() {
    setBusy('test'); setResult(null);
    try { setResult(await api<Result>(`${base}/test`, { body: key ? { key } : {} })); }
    catch (x) { setResult({ ok: false, message: (x as Error).message }); }
    setBusy('');
  }
  async function remove() {
    if (!(await ask({ title: `Remove the ${info.label} key?`, message: 'The assistant will stop using this model until a key is added again.', confirmLabel: 'Remove key' }))) return;
    await api(base, { method: 'DELETE' });
    setKey(''); setModel(''); setResult(null);
    await onChange();
  }

  const ready = info.source !== 'none';
  return (
    <div className={`key-card${ready ? ' ready' : ''}`}>
      <div className="key-top">
        <span className={`key-badge ${info.provider}`} aria-hidden>{info.label[0]}</span>
        <div className="key-name">
          <b>{info.label}</b>
          <small>{info.source === 'settings' ? `Key saved ${info.hint}` : info.source === 'env' ? `Key from apps/api/.env ${info.hint}` : 'No key yet'}</small>
        </div>
        <span className={`status-pill ${ready ? 'on' : ''}`}>{ready ? 'Ready' : 'Not set up'}</span>
      </div>

      <div className="key-fields">
        <label>
          <span>API key</span>
          <input type="password" autoComplete="off" spellCheck={false} placeholder={ready ? 'Paste a new key to replace it' : 'Paste your key'} value={key} onChange={(e) => { setKey(e.target.value); setResult(null); }} />
        </label>
        <label>
          <span>Model <span className="muted">(optional)</span></span>
          <input placeholder={info.defaultModel} spellCheck={false} value={model} onChange={(e) => { setModel(e.target.value); setResult(null); }} />
        </label>
      </div>
      {info.source === 'env' && <p className="muted key-note">This key comes from <code>{info.keyEnv}</code> in <code>apps/api/.env</code>. A key saved here is used instead.</p>}

      <div className="key-actions">
        <a className="link" href={getKey[info.provider].url} target="_blank" rel="noreferrer noopener">Get a key at {getKey[info.provider].host} ↗</a>
        <span className="grow" />
        {info.source === 'settings' && <button className="link delete-link always" onClick={remove}>Remove key</button>}
        <button onClick={test} disabled={!!busy || (!key && !ready)}>{busy === 'test' ? 'Testing…' : 'Test'}</button>
        <button className="primary" onClick={save} disabled={!!busy || !changed}>{busy === 'save' ? 'Saving…' : 'Save'}</button>
      </div>
      {result && <p className={result.ok ? 'ok' : 'err'}>{result.message}</p>}
    </div>
  );
}

/** Settings › AI assistant: the keys for Claude, ChatGPT and Gemini. */
export function AiKeys({ site, onChange }: { site: Site; onChange?: () => void }) {
  const [list, setList] = useState<KeyInfo[] | null>(null);
  const [err, setErr] = useState('');
  const load = async () => { try { setList(await api<KeyInfo[]>(`/sites/${site.id}/ai-keys`)); onChange?.(); } catch (x) { setErr((x as Error).message); } };
  useEffect(() => { setList(null); load(); }, [site.id]);

  return (
    <div className="key-list">
      {err && <p className="err">{err}</p>}
      {list?.map((k) => <KeyCard key={k.provider} site={site} info={k} onChange={load} />)}
      {!list && !err && <p className="muted">Loading…</p>}
    </div>
  );
}
