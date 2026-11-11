import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, type Site } from '../api';

/** What the assistant proposes. It never saves or publishes: the page editor applies it as unsaved changes. */
export interface Proposal {
  summary: string[];
  edits: { path: string; value: unknown }[];
  addSections: { type: string; data: Record<string, unknown>; afterKey: string }[];
  removeKeys: string[];
  readyToPublish: boolean;
}
/** One change the editor made from a proposal, in words the editor can read. */
export interface Change { kind: 'edit' | 'add' | 'remove'; where: string; field?: string; from?: string; to?: string }
/** Returned by the editor once a proposal is applied: what changed, and a way to take it back. */
export interface Applied { lines: string[]; changes: Change[]; undo: () => void }

interface Info {
  providers: { id: string; label: string; configured: boolean; model: string; keyName: string }[];
  drive: boolean;
  mcp: { servers: string[]; tools: number; hidden: number; errors: string[] };
  apis: { name: string; description: string }[];
}
interface Msg {
  role: 'user' | 'assistant'; content: string; applied?: Applied; locked?: boolean; undone?: boolean;
  ready?: boolean; tools?: { name: string; ok: boolean }[]; error?: boolean;
  /** a small status line (for example "switched to Gemini"), not part of the conversation sent to the AI */
  note?: boolean;
}

const KEY = 'cms_agent_provider';
/** Which model to use first, and which to switch to when one runs out of credits: the free-to-start one first. */
const PREFER = ['gemini', 'anthropic', 'openai'];
const GOOGLE_LINK = /https:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/[\w-]+[^\s]*/i;
const toolLabel = (n: string) =>
  n === 'read_google_doc' ? 'Read a Google file' : n === 'call_api' ? 'Read from an API' : n.startsWith('mcp_') ? `Used ${n.split('_')[1]} (MCP)` : n;

const suggestions = [
  { icon: 'bolt', title: 'Tighten the copy', text: 'Make the headline and intro shorter and punchier.' },
  { icon: 'doc', title: 'Fill from a Google Doc', text: 'Fill this page from this Google Doc: ' },
  { icon: 'chat', title: 'Change the tone', text: 'Rewrite the text on this page in a warmer, friendlier voice.' },
];
const followUps = ['Make it shorter', 'Make it friendlier', 'Fix any typos'];

/* ---------- small icons ---------- */
const Spark = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6-5.6-1.9 5.6-1.9zM18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" /></svg>
);
const Icon = ({ name }: { name: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {name === 'bolt' && <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />}
    {name === 'doc' && <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9.5 12h5M9.5 15.5h5" /></>}
    {name === 'chat' && <path d="M4 5.5h16v10H9l-5 4z" />}
    {name === 'plus' && <path d="M12 5v14M5 12h14" />}
    {name === 'copy' && <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>}
    {name === 'check' && <path d="M5 12.5l4.5 4.5L19 7" />}
    {name === 'close' && <path d="M6 6l12 12M18 6L6 18" />}
    {name === 'undo' && <><path d="M9 7L4 12l5 5" /><path d="M4 12h9a6 6 0 0 1 0 12" transform="translate(0 -5)" /></>}
  </svg>
);

/* ---------- formatting for the assistant's replies (bold, code, links, lists), without any HTML injection ---------- */
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s)]+)/g);
  return parts.map((p, i) => {
    if (!p) return null;
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return <code key={i}>{p.slice(1, -1)}</code>;
    const md = p.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (md) return <a key={i} href={md[2]} target="_blank" rel="noreferrer noopener">{md[1]}</a>;
    if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noreferrer noopener">{p}</a>;
    return p;
  });
}
function Rich({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => { if (para.length) blocks.push(<p key={blocks.length}>{para.flatMap((l, i) => (i ? [<br key={`b${i}`} />, ...inline(l)] : inline(l)))}</p>); para = []; };
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(<Tag key={blocks.length}>{list.items.map((t, i) => <li key={i}>{inline(t)}</li>)}</Tag>);
    list = null;
  };
  for (const line of text.split('\n')) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const number = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || number) {
      flushPara();
      const ordered = !!number;
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] }; }
      list.items.push((bullet ?? number)![1]);
    } else if (!line.trim()) {
      flushPara(); flushList();
    } else {
      flushList(); para.push(line);
    }
  }
  flushPara(); flushList();
  return <>{blocks}</>;
}

/* ---------- pieces of a conversation ---------- */
function Changes({ applied, locked, onUndo }: { applied: Applied; locked?: boolean; onUndo: () => void }) {
  const n = applied.changes.length;
  return (
    <details className="ag-changes" open={n <= 4}>
      <summary>
        <span className="ag-dot" aria-hidden />
        <b>{n} change{n === 1 ? '' : 's'} applied</b>
        <span className="muted">· not saved yet</span>
        {!locked && <button type="button" className="ag-undo" onClick={(e) => { e.preventDefault(); onUndo(); }}><Icon name="undo" /> Undo</button>}
      </summary>
      <ul>
        {applied.changes.map((c, i) => (
          <li key={i} className={c.kind}>
            {c.kind === 'edit' ? (
              <>
                <div className="ag-where"><span>{c.where}</span><b>{c.field}</b></div>
                <div className="ag-diff">
                  <del>{c.from || '(empty)'}</del>
                  <ins>{c.to || '(empty)'}</ins>
                </div>
              </>
            ) : (
              <div className="ag-where"><span>{c.kind === 'add' ? 'Added section' : 'Removed section'}</span><b>{c.where}</b></div>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

function Bubble({ m, last, busy, onUndo, onPublish, onFollow }: { m: Msg; last: boolean; busy: boolean; onUndo: () => void; onPublish: () => void; onFollow: (t: string) => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(m.content); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* clipboard not available */ }
  };
  if (m.note) return <div className="ag-switch" role="status">{m.content}</div>;
  if (m.role === 'user') return <div className="ag-msg user"><div className="ag-bubble">{m.content}</div></div>;
  const steps = m.tools?.filter((t) => t.name !== 'propose_changes') ?? [];
  return (
    <div className={`ag-msg assistant${m.error ? ' error' : ''}`}>
      <span className="ag-avatar" aria-hidden><Spark size={14} /></span>
      <div className="ag-body">
        <div className="ag-bubble"><Rich text={m.content} /></div>
        {steps.length > 0 && (
          <div className="ag-steps">{steps.map((t, i) => <span key={i} className={t.ok ? 'ok' : 'bad'}><Icon name={t.ok ? 'check' : 'close'} />{toolLabel(t.name)}</span>)}</div>
        )}
        {m.applied && <Changes applied={m.applied} locked={m.locked} onUndo={onUndo} />}
        {m.undone && <p className="ag-note">Those changes were taken back.</p>}
        {m.ready && !m.undone && (
          <div className="ag-publish">
            <div><b>Ready to publish</b><span className="muted">Review the page, then publish when you are happy.</span></div>
            <button type="button" className="primary" onClick={onPublish}>Review and publish…</button>
          </div>
        )}
        {!m.error && (
          <div className="ag-tools">
            <button type="button" onClick={copy} title="Copy reply"><Icon name={copied ? 'check' : 'copy'} />{copied ? 'Copied' : 'Copy'}</button>
          </div>
        )}
        {last && !busy && m.applied && !m.undone && (
          <div className="ag-follow">{followUps.map((f) => <button key={f} type="button" onClick={() => onFollow(f)}>{f}</button>)}</div>
        )}
      </div>
    </div>
  );
}

/** Chat panel: pick Claude, ChatGPT or Gemini, describe the change (or paste a Google Doc link), review what it did. */
export function AgentPanel({ site, typeSlug, getDoc, apply, onPublish, active, onClose }: {
  site: Site;
  typeSlug: string;
  getDoc: () => { data: Record<string, unknown>; sections: { id: string; type: string; data: Record<string, unknown> }[]; status: string };
  apply: (p: Proposal) => Applied;
  onPublish: () => void;
  active: boolean;
  /** Shows a close button (used where the panel is a drawer). */
  onClose?: () => void;
}) {
  const [info, setInfo] = useState<Info | null>(null);
  const [provider, setProvider] = useState(() => localStorage.getItem(KEY) ?? '');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [waited, setWaited] = useState(0);
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const [infoErr, setInfoErr] = useState('');
  // Which models are ready. Loaded when the panel opens, retried on its own if the server was busy restarting, and
  // refreshed when you come back to the tab (so a key added in Settings shows up without a reload).
  const loadInfo = useCallback(() => api<Info>(`/sites/${site.id}/agent/providers`).then((i) => {
    setInfo(i);
    setInfoErr('');
    setProvider((cur) => (i.providers.some((p) => p.id === cur && p.configured) ? cur : PREFER.find((id) => i.providers.some((p) => p.id === id && p.configured)) ?? cur));
  }).catch((e) => setInfoErr((e as Error).message)), [site.id]);
  useEffect(() => { if (active) loadInfo(); }, [loadInfo, active]);
  useEffect(() => {
    if (!infoErr) return;
    // keeps trying every few seconds until the server answers (the error clears on success)
    const t = setInterval(loadInfo, 3000);
    return () => clearInterval(t);
  }, [infoErr, loadInfo]);
  useEffect(() => {
    window.addEventListener('focus', loadInfo);
    return () => window.removeEventListener('focus', loadInfo);
  }, [loadInfo]);
  useEffect(() => { if (provider) localStorage.setItem(KEY, provider); }, [provider]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [msgs, busy, active]);
  useEffect(() => {
    // the text box grows with what you type, up to a few lines
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  }, [text, active]);
  useEffect(() => {
    if (!busy) { setWaited(0); return; }
    const t = setInterval(() => setWaited((w) => w + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  const chosen = info?.providers.find((p) => p.id === provider);
  const ready = !!chosen?.configured;
  const link = text.match(GOOGLE_LINK);

  const labelOf = (id: string) => info?.providers.find((p) => p.id === id)?.label ?? id;

  /** Asks one model. If it is out of credits or rejects its key, the next ready model (Gemini first) takes over by itself. */
  async function ask(history: Msg[], prov: string, tried: string[]): Promise<void> {
    try {
      const r = await api<{ reply: string; proposal: Proposal | null; tools: { name: string; ok: boolean }[] }>(`/sites/${site.id}/agent/chat`, {
        body: { provider: prov, messages: history.filter((m) => !m.note).map((m) => ({ role: m.role, content: m.content })), doc: { typeSlug, ...getDoc() } },
      });
      // earlier changes can no longer be taken back once newer ones are on top
      const applied = r.proposal && (r.proposal.edits.length || r.proposal.addSections.length || r.proposal.removeKeys.length) ? apply(r.proposal) : undefined;
      setMsgs((m) => [...m.map((x) => ({ ...x, locked: !!x.applied || x.locked })), { role: 'assistant', content: r.reply, applied, ready: r.proposal?.readyToPublish, tools: r.tools }]);
    } catch (e) {
      const code = (e as { code?: string }).code;
      const used = [...tried, prov];
      const other = code === 'credits' || code === 'key'
        ? PREFER.find((id) => !used.includes(id) && info?.providers.some((p) => p.id === id && p.configured))
        : undefined;
      if (other) {
        setMsgs((m) => [...m, { role: 'assistant', content: `${labelOf(prov)} can't be used right now (${code === 'credits' ? 'no credits left' : 'its key was rejected'}). Switching to ${labelOf(other)}…`, note: true }]);
        setProvider(other);
        return ask(history, other, used);
      }
      setMsgs((m) => [...m, { role: 'assistant', content: (e as Error).message, error: true }]);
    }
  }

  async function send(content = text) {
    const q = content.trim();
    if (!q || busy || !ready) return;
    setText('');
    const history = [...msgs, { role: 'user' as const, content: q }];
    setMsgs(history);
    setBusy(true);
    await ask(history, provider, []);
    setBusy(false);
  }

  const undo = (i: number) => {
    msgs[i].applied?.undo();
    setMsgs((m) => m.map((x, j) => (j === i ? { ...x, applied: undefined, undone: true } : x)));
  };

  const lastAssistant = (() => { for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === 'assistant') return i; return -1; })();

  return (
    <div className="agent" hidden={!active}>
      <header className="ag-head">
        <span className="ag-logo" aria-hidden><Spark size={18} /></span>
        <div className="ag-title">
          <b>AI assistant</b>
          <small>{chosen ? `${chosen.label} · ${chosen.model}` : info ? 'Choose a model' : infoErr ? 'Not connected' : 'Connecting…'}</small>
        </div>
        <div className="ag-head-actions">
          {info && info.providers.length > 1 ? (
            <select aria-label="AI model" value={provider} onChange={(e) => setProvider(e.target.value)}>
              {!provider && <option value="">Choose…</option>}
              {info.providers.map((p) => <option key={p.id} value={p.id} disabled={!p.configured}>{p.label}{p.configured ? '' : ' (no key)'}</option>)}
            </select>
          ) : null}
          <button type="button" className="ag-icon" title="New chat" aria-label="New chat" disabled={!msgs.length || busy} onClick={() => setMsgs([])}><Icon name="plus" /></button>
          {onClose && <button type="button" className="ag-icon" title="Close" aria-label="Close the assistant" onClick={onClose}><Icon name="close" /></button>}
        </div>
      </header>

      <div className="ag-scroll">
        {!info && infoErr && (
          <div className="ag-setup">
            <b>Can't reach the server</b>
            <p className="muted">{infoErr} Trying again…</p>
            <button type="button" onClick={loadInfo}>Try now</button>
          </div>
        )}
        {info && !info.providers.some((p) => p.configured) && (
          <div className="ag-setup">
            <b>Add an AI key to get started</b>
            <p className="muted">Put at least one in <code>apps/api/.env</code> and restart the API:</p>
            <ul>{info.providers.map((p) => <li key={p.id}><code>{p.keyName}</code><span className="muted"> for {p.label}</span></li>)}</ul>
          </div>
        )}

        {!msgs.length && (
          <div className="ag-welcome">
            <span className="ag-hero" aria-hidden><Spark size={26} /></span>
            <h3>What should we write?</h3>
            <p className="muted">Describe a change, paste a Google Doc link, or ask me to fill in this page. I prepare the edits and you decide what goes live.</p>
            <div className="ag-cards">
              {suggestions.map((s) => (
                <button key={s.title} type="button" disabled={!ready} onClick={() => { setText(s.text); box.current?.focus(); }}>
                  <span className="ag-card-icon"><Icon name={s.icon} /></span>
                  <span><b>{s.title}</b><small>{s.text.trim()}</small></span>
                </button>
              ))}
            </div>
            <div className="ag-sources">
              <span className="ag-chip on"><i />Google Docs</span>
              {info && info.mcp.tools > 0 && <span className="ag-chip on"><i />{info.mcp.tools} MCP tool{info.mcp.tools === 1 ? '' : 's'}</span>}
              {info?.apis.map((a) => <span key={a.name} className="ag-chip on"><i />{a.name}</span>)}
              {info && !info.mcp.tools && !info.apis.length && <span className="ag-chip">Add MCP or APIs in Settings</span>}
            </div>
            {info && info.mcp.errors.length > 0 && <p className="err ag-small">MCP: {info.mcp.errors.join('; ')}</p>}
          </div>
        )}

        {msgs.map((m, i) => (
          <Bubble key={i} m={m} last={i === lastAssistant} busy={busy} onUndo={() => undo(i)} onPublish={onPublish} onFollow={(t) => send(t)} />
        ))}

        {busy && (
          <div className="ag-msg assistant">
            <span className="ag-avatar" aria-hidden><Spark size={14} /></span>
            <div className="ag-body"><div className="ag-bubble ag-typing"><span /><span /><span /><em>{waited > 8 ? 'Still working…' : 'Thinking…'}</em></div></div>
          </div>
        )}
        <div ref={end} />
      </div>

      <form className="ag-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
        {link && <div className="ag-attach"><Icon name="doc" /> A Google {link[1] === 'spreadsheets' ? 'Sheet' : link[1] === 'presentation' ? 'Slides file' : 'Doc'} link was found. I will read it (it must be shared as “Anyone with the link”).</div>}
        <div className="ag-input">
          <textarea
            ref={box}
            rows={1}
            value={text}
            placeholder={ready ? 'Ask for a change, or paste a Google Doc link…' : info ? 'Add an AI key to start' : 'Connecting to the server…'}
            disabled={!ready || busy}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
          />
          <button className="ag-send" aria-label="Send" disabled={!ready || busy || !text.trim()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" /></svg>
          </button>
        </div>
      </form>
    </div>
  );
}
