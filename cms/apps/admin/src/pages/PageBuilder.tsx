import { useEffect, useRef, useState } from 'react';
import { ask } from '../lib/confirm';
import { api, type ContentType, type Entry, type Section, type Site } from '../api';
import { FieldForm } from './FieldInput';
import { AgentPanel, type Applied, type Proposal } from './AgentPanel';
import { applyProposalTo, useAiOpen } from '../lib/assistant';
import { History } from './History';

type Status = 'DRAFT' | 'PUBLISHED';
type Draft = Partial<Entry> & { contentTypeId: string };

const COLLAPSED = 6;
const uid = () => crypto.randomUUID();
/** A short title for a section or page: its first text field that has something in it, else its first long text, else the first line of its first list. */
const clip = (s: string) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > 70 ? t.slice(0, 69) + '…' : t; };
const firstText = (t: ContentType | undefined, d: Record<string, unknown>) => {
  const fields = t?.fields ?? [];
  const has = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
  for (const f of fields) if (f.type === 'text' && has(d[f.name])) return clip(d[f.name] as string);
  for (const f of fields) if (f.type === 'textarea' && has(d[f.name])) return clip(d[f.name] as string);
  for (const f of fields) {
    const first = f.type === 'array' && Array.isArray(d[f.name]) ? (d[f.name] as Record<string, unknown>[])[0] : undefined;
    for (const sf of f.fields ?? []) if ((sf.type === 'text' || sf.type === 'textarea') && has(first?.[sf.name])) return clip(first![sf.name] as string);
  }
  return '';
};
const firstImage = (t: ContentType | undefined, d: Record<string, unknown>) => {
  const f = t?.fields.find((x) => x.type === 'image');
  const v = f && d[f.name];
  return typeof v === 'string' && v ? v : null;
};

const Doc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>
);
const Grip = () => (
  <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden>{[3, 9, 15].flatMap((y) => [3, 10].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.4" />))}</svg>
);

/**
 * Columns 2 and 3 for a page: the ordered list of sections (drag to reorder, "…" menu, Add item) and the
 * editor for whatever is selected: the page's own fields, or one section's fields.
 */
export function PageBuilder({ site, type, sectionTypes, entry, canEdit, onSaved, onDeleted, onRestored, back }: {
  site: Site; type: ContentType; sectionTypes: ContentType[]; entry: Draft; canEdit: boolean;
  onSaved: (e: Entry) => void; onDeleted: () => void; onRestored: (e: Entry) => void;
  /** Where this page was opened from (for example the Footer), with a way back to it. */
  back?: { label: string; onClick: () => void };
}) {
  const init = entry.data ?? {};
  const [data, setData] = useState<Record<string, unknown>>(() => { const { sections: _s, ...rest } = init; return rest; });
  const [sections, setSections] = useState<Section[]>(() => (Array.isArray(init.sections) ? (init.sections as Section[]) : []));
  const [slug, setSlug] = useState(entry.slug ?? '');
  const [status, setStatus] = useState<Status>(entry.status ?? 'DRAFT');
  const [sel, setSel] = useState<'page' | string>('page');
  const [menu, setMenu] = useState<string | null>(null);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  // The save button only shows when something has changed since the last save.
  const snapshot = (st = status) => JSON.stringify([data, sections, slug, st]);
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot() !== baseline;
  const [showHistory, setShowHistory] = useState(false);
  const base = `/sites/${site.id}/entries`;
  const def = (slugName: string) => sectionTypes.find((t) => t.slug === slugName);

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const move = (id: string, delta: number) => setSections((list) => {
    const i = list.findIndex((s) => s.id === id), j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const reorder = (from: string, to: string) => setSections((list) => {
    const i = list.findIndex((s) => s.id === from), j = list.findIndex((s) => s.id === to);
    if (i < 0 || j < 0 || i === j) return list;
    const next = [...list];
    const [item] = next.splice(i, 1);
    next.splice(j, 0, item);
    return next;
  });
  const duplicate = (id: string) => setSections((list) => {
    const i = list.findIndex((s) => s.id === id);
    if (i < 0) return list;
    const copy = { ...list[i], id: uid(), data: structuredClone(list[i].data) };
    return [...list.slice(0, i + 1), copy, ...list.slice(i + 1)];
  });
  const remove = async (id: string) => {
    const s = sections.find((x) => x.id === id);
    const name = (s && sectionTypes.find((t) => t.slug === s.type)?.name) || 'this';
    if (!(await ask({ title: `Delete the ${name} section?`, message: 'It is removed from the page when you save.', confirmLabel: 'Delete' }))) return;
    setSections((l) => l.filter((x) => x.id !== id));
    if (sel === id) setSel('page');
  };
  const add = (t: ContentType, index: number) => {
    const s = { id: uid(), type: t.slug, data: {} };
    setSections((l) => [...l.slice(0, index), s, ...l.slice(index)]);
    setSel(s.id);
    setInsertAt(null);
  };
  const patchSection = (id: string, d: Record<string, unknown>) => setSections((l) => l.map((s) => (s.id === id ? { ...s, data: d } : s)));


  /** Save keeps the status as it is; Publish saves and makes the page Published. */
  async function save(publish = false) {
    const next = publish ? 'PUBLISHED' : status;
    setErr(''); setSaving(true);
    try {
      const body = { slug: slug || null, data: { ...data, sections }, status: next, contentTypeId: type.id };
      const saved = entry.id ? await api<Entry>(`${base}/${entry.id}`, { method: 'PUT', body }) : await api<Entry>(base, { body });
      if (publish) setStatus('PUBLISHED');
      setBaseline(snapshot(next));
      onSaved(saved);
    } catch (x) { setErr((x as Error).message); }
    setSaving(false);
  }

  const pageTitle = firstText(type, data) || slug || (entry.id ? 'Untitled page' : 'New page');
  const visible = showAll ? sections : sections.slice(0, COLLAPSED);
  const current = sel === 'page' ? null : sections.find((s) => s.id === sel);
  const currentDef = current ? def(current.type) : undefined;

  const form = (
    <div className="editor-form">
      {current && currentDef ? (
        <>
          <p className="muted">{currentDef.name}</p>
          <FieldForm site={site} path={current.id} fields={currentDef.fields} data={current.data} disabled={!canEdit} onChange={(d) => patchSection(current.id, d)} />
        </>
      ) : (
        <>
          <p className="muted">Page settings</p>
          <FieldForm site={site} path="page" fields={type.fields} data={data} disabled={!canEdit} onChange={setData} />
          <div className="fld"><label className="lbl">Slug</label><input value={slug} disabled={!canEdit} onChange={(e) => setSlug(e.target.value)} placeholder="home" /></div>
        </>
      )}
      {err && <p className="err">{err}</p>}
    </div>
  );

  // AI assistant (drawer on the right): its changes land here as unsaved edits
  const [aiOpen, toggleAi] = useAiOpen();
  const live = useRef({ data, sections });
  live.current = { data, sections };
  const applyProposal = (p: Proposal): Applied => {
    const before = live.current;
    const r = applyProposalTo(before, p, type.name, type.fields, sectionTypes);
    setData(r.data);
    setSections(r.sections);
    if (sel !== 'page' && !r.sections.some((x) => x.id === sel)) setSel('page');
    return { lines: r.lines, changes: r.changes, undo: () => { setData(before.data); setSections(before.sections); } };
  };
  const publish = async () => {
    if (await ask({ title: 'Publish changes?', message: 'They go live on the site right away.', confirmLabel: 'Publish', tone: 'primary' })) save(true);
  };

  return (
    <>
      <section className="pane pane-list">
        <div className="pane-head">
          {back && <button className="link" onClick={back.onClick} title={`Back to ${back.label}`}>‹ {back.label}</button>}
          <h2 className="pane-title">Page Builder</h2>
        </div>
        <button className={`doc-row${sel === 'page' ? ' on' : ''}`} onClick={() => setSel('page')}>
          <Doc /><span className="doc-title">{pageTitle}</span><span className="muted">page settings</span>
        </button>

        <div className="builder">
          {!sections.length && <p className="muted pad">No sections yet. Add the first one below.</p>}
          {visible.map((s) => {
            const d = def(s.type);
            const img = firstImage(d, s.data);
            return (
              <div key={s.id}
                className={`sec-row${sel === s.id ? ' on' : ''}${dragId === s.id ? ' dragging' : ''}`}
                draggable={canEdit}
                onDragStart={() => setDragId(s.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragId) reorder(dragId, s.id); setDragId(null); }}
                onDragEnd={() => setDragId(null)}
                onClick={() => setSel(s.id)}>
                <span className="grip" title="Drag to reorder"><Grip /></span>
                <span className="sec-thumb">{img ? <img src={img} alt="" /> : <Doc />}</span>
                <span className="sec-text">
                  <b>{firstText(d, s.data) || d?.name || s.type}</b>
                  <small>{d?.name ?? 'Unknown section'}</small>
                </span>
                {canEdit && (
                  <button className="more" aria-label="Section actions" onClick={(e) => { e.stopPropagation(); setMenu(menu === s.id ? null : s.id); }}>⋯</button>
                )}
                {menu === s.id && (
                  <div className="menu" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { move(s.id, -1); setMenu(null); }}>Move up</button>
                    <button onClick={() => { move(s.id, 1); setMenu(null); }}>Move down</button>
                    <button onClick={() => { setInsertAt(sections.findIndex((x) => x.id === s.id)); setMenu(null); }}>Insert above</button>
                    <button onClick={() => { setInsertAt(sections.findIndex((x) => x.id === s.id) + 1); setMenu(null); }}>Insert below</button>
                    <button onClick={() => { duplicate(s.id); setMenu(null); }}>Duplicate</button>
                    <button className="danger" onClick={() => { remove(s.id); setMenu(null); }}>Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {sections.length > COLLAPSED && (
          <button className="show-all" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show fewer' : `Show all ${sections.length} items`}</button>
        )}

        {canEdit && (
          <div className="add-wrap">
            <button className="add-item" onClick={(e) => { e.stopPropagation(); setInsertAt(sections.length); setMenu(null); }}>+ Add item…</button>
          </div>
        )}
        {insertAt !== null && <InsertDialog types={sectionTypes} onPick={(t) => add(t, insertAt)} onClose={() => setInsertAt(null)} />}
      </section>

      <section className="pane pane-editor">
        <div className="editor">
          <header className="editor-bar">
            <h2>{current ? (firstText(currentDef, current.data) || currentDef?.name || 'Section') : pageTitle}</h2>
            <div className="chips">
              <button className={`chip published${status === 'PUBLISHED' ? ' on' : ''}`} disabled={!canEdit} onClick={() => setStatus('PUBLISHED')}><i />Published</button>
              <button className={`chip draft${status === 'DRAFT' ? ' on' : ''}`} disabled={!canEdit} onClick={() => setStatus('DRAFT')}><i />Draft</button>
            </div>
            <div className="grow" />
            {canEdit && <button className={`ai-toggle${aiOpen ? ' on' : ''}`} aria-pressed={aiOpen} onClick={toggleAi}>✦ AI assistant</button>}
            {entry.id && <button className="link" onClick={() => setShowHistory(true)}>History</button>}
            {canEdit && entry.id && <button className="link delete-link" onClick={async () => { if (await ask({ title: 'Delete this page?', message: 'The page and all its sections are removed permanently and cannot be undone.', confirmLabel: 'Delete page' })) { await api(`${base}/${entry.id}`, { method: 'DELETE' }); onDeleted(); } }}>Delete page</button>}
            {canEdit && dirty && !saving && <span className="muted">Unsaved changes</span>}
            {canEdit && <button disabled={saving || !dirty} onClick={() => save()}>{saving ? 'Saving…' : 'Save'}</button>}
            {canEdit && <button className="primary" disabled={saving || !dirty} onClick={async () => { if (await ask({ title: 'Publish changes?', message: 'They go live on the site right away.', confirmLabel: 'Publish', tone: 'primary' })) save(true); }}>Publish</button>}
          </header>
          <div className="editor-scroll">{form}</div>
        </div>
      </section>
      {showHistory && entry.id && <History site={site} entryId={entry.id} name={pageTitle} canEdit={canEdit} onClose={() => setShowHistory(false)} onRestored={onRestored} />}
      {canEdit && (
        <aside className="ai-drawer" hidden={!aiOpen}>
          <AgentPanel site={site} typeSlug={type.slug} active={aiOpen} onClose={toggleAi} apply={applyProposal} onPublish={publish}
            getDoc={() => ({ data: live.current.data, sections: live.current.sections, status })} />
        </aside>
      )}
    </>
  );
}

/** Sanity-style insert menu: a dialog with a search filter and a list or grid view of the section types. */
function InsertDialog({ types, onPick, onClose }: { types: ContentType[]; onPick: (t: ContentType) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [grid, setGrid] = useState(() => { try { return localStorage.getItem('cms_insert_grid') === '1'; } catch { return false; } });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const setView = (g: boolean) => { setGrid(g); try { localStorage.setItem('cms_insert_grid', g ? '1' : '0'); } catch { /* ignore */ } };
  const shown = types.filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" role="dialog" aria-label="Add item" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <h3>Add item</h3>
          <button className="link" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="dialog-tools">
          <input autoFocus placeholder="Search section types" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="seg">
            <button className={!grid ? 'on' : ''} onClick={() => setView(false)}>List</button>
            <button className={grid ? 'on' : ''} onClick={() => setView(true)}>Grid</button>
          </div>
        </div>
        <div className={grid ? 'insert-grid' : 'insert-list'}>
          {shown.map((t) => (
            <button key={t.id} className="insert-item" onClick={() => onPick(t)}>
              <span className="insert-icon">{t.name.slice(0, 1).toUpperCase()}</span>
              <span className="insert-name">{t.name}</span>
              <small>{t.fields.length} fields</small>
            </button>
          ))}
          {!shown.length && <p className="muted pad">{types.length ? 'No section type matches.' : 'No section types yet. Create some under Content types (kind: Section block).'}</p>}
        </div>
      </div>
    </div>
  );
}
