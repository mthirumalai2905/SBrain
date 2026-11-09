import { useEffect, useRef, useState } from 'react';
import { api, type ContentType, type Entry, type Field, type Section, type Site } from '../api';
import { FieldForm } from './FieldInput';
import { MediaPicker } from './MediaPicker';
import { IconPicker } from './IconPicker';
import { AgentPanel, type Applied, type Proposal } from './AgentPanel';
import { applyProposalTo } from '../lib/assistant';
import { Preview, type PreviewSelect } from './Preview';
import { focusPath } from '../lib/focus';
import { setAtPath } from '../lib/path';
import { ask } from '../lib/confirm';

type Status = 'DRAFT' | 'PUBLISHED';
type Draft = Partial<Entry> & { contentTypeId: string };
interface Doc { key: string; label: string; group: 'Pages' | 'Content'; type: ContentType; entry?: Entry }

const titleOf = (e: Partial<Entry>, t?: ContentType) => {
  const f = t?.fields.find((x) => x.type === 'text');
  return (f && (e.data?.[f.name] as string)) || e.slug || 'Untitled';
};
const firstText = (t: ContentType | undefined, d: Record<string, unknown>) => {
  const f = t?.fields.find((x) => x.type === 'text');
  return f ? String(d[f.name] ?? '') : '';
};

/**
 * Live preview: pick a page or document, see it large on the left (your site, or a built-in view), and edit
 * it in the panel on the right. Clicking text or an image on the page jumps to that field, and every change
 * shows up on the page as you type.
 */
export function LivePreview({ site, canEdit }: { site: Site; canEdit: boolean }) {
  const [types, setTypes] = useState<ContentType[] | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [docKey, setDocKey] = useState('');
  const base = `/sites/${site.id}`;

  const reload = async () => setEntries(await api<Entry[]>(`${base}/entries`));
  useEffect(() => {
    Promise.all([api<ContentType[]>(`${base}/types`), api<Entry[]>(`${base}/entries`)]).then(([t, e]) => { setTypes(t); setEntries(e); });
  }, [site.id]);

  const docs: Doc[] = [];
  if (types) {
    const created = (x: Entry, y: Entry) => x.createdAt.localeCompare(y.createdAt);
    for (const t of types.filter((x) => x.kind === 'page')) {
      for (const e of entries.filter((x) => x.contentTypeId === t.id).sort(created)) docs.push({ key: e.id, label: titleOf(e, t), group: 'Pages', type: t, entry: e });
    }
    for (const t of types.filter((x) => x.kind === 'singleton')) {
      const e = entries.find((x) => x.contentTypeId === t.id);
      docs.push({ key: e?.id ?? `type:${t.id}`, label: t.name, group: 'Content', type: t, entry: e });
    }
    for (const t of types.filter((x) => x.kind === 'collection')) {
      for (const e of entries.filter((x) => x.contentTypeId === t.id).sort(created)) docs.push({ key: e.id, label: `${t.name}: ${titleOf(e, t)}`, group: 'Content', type: t, entry: e });
    }
  }
  const doc = docs.find((d) => d.key === docKey) ?? docs[0];
  const sectionTypes = types?.filter((t) => t.kind === 'section') ?? [];

  if (!types) return null;
  if (!doc) {
    return <div className="empty"><h2>Nothing to preview yet</h2><p className="muted">Create a page or a single document under Structure first.</p></div>;
  }

  return (
    <div className="live">
      <div className="live-bar">
        <label className="lbl" htmlFor="live-doc">Previewing</label>
        <select id="live-doc" value={doc.key} onChange={(e) => setDocKey(e.target.value)}>
          {(['Pages', 'Content'] as const).map((g) => docs.some((d) => d.group === g) && (
            <optgroup key={g} label={g}>{docs.filter((d) => d.group === g).map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</optgroup>
          ))}
        </select>
      </div>
      <LiveEditor
        key={`${doc.type.id}:${doc.entry?.id ?? 'new'}`}
        site={site} type={doc.type} sectionTypes={sectionTypes} canEdit={canEdit}
        entry={doc.entry ?? { contentTypeId: doc.type.id, data: {}, status: 'DRAFT' }}
        onSaved={async (saved) => { await reload(); setDocKey(saved.id); }}
      />
    </div>
  );
}

function LiveEditor({ site, type, sectionTypes, entry, canEdit, onSaved }: {
  site: Site; type: ContentType; sectionTypes: ContentType[]; entry: Draft; canEdit: boolean; onSaved: (e: Entry) => void;
}) {
  const isPage = type.kind === 'page';
  const single = type.kind === 'singleton';
  const init = entry.data ?? {};
  const [data, setData] = useState<Record<string, unknown>>(() => { const { sections: _s, ...rest } = init; return rest; });
  const [sections, setSections] = useState<Section[]>(() => (isPage && Array.isArray(init.sections) ? (init.sections as Section[]) : []));
  const [slug, setSlug] = useState(entry.slug ?? '');
  const [status, setStatus] = useState<Status>(entry.status ?? 'DRAFT');
  const [sel, setSel] = useState<'page' | string>('page');
  const [tab, setTab] = useState<'edit' | 'ai'>('edit');
  const [selPath, setSelPath] = useState<string | undefined>();
  const [picking, setPicking] = useState<string | null>(null);
  const [pickingIcon, setPickingIcon] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [savedAt, setSavedAt] = useState(false);
  // The save button only shows when something has changed since the last save.
  const snapshot = (st: Status = status) => JSON.stringify([data, sections, slug, st]);
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot() !== baseline;
  const def = (s: string) => sectionTypes.find((t) => t.slug === s);

  /** Sets one value by its edit path: "page.title", or "<sectionId>.items.1.text". */
  const applyEdit = (path: string, value: unknown) => {
    const [target, ...rest] = path.split('.');
    if (target === 'page') setData((d) => setAtPath(d, rest, value));
    else setSections((l) => l.map((x) => (x.id === target ? { ...x, data: setAtPath(x.data, rest, value) } : x)));
  };
  /** The field definition an edit path points at (list item numbers are skipped). */
  const fieldAt = (path: string, secs: Section[] = sections): Field | undefined => {
    const [target, ...rest] = path.split('.');
    let fields = target === 'page' ? type.fields : def(secs.find((x) => x.id === target)?.type ?? '')?.fields;
    let found: Field | undefined;
    for (const part of rest) {
      if (!isNaN(Number(part))) continue;
      found = fields?.find((x) => x.name === part);
      fields = found?.fields;
    }
    return found;
  };
  /** The current value at an edit path (so a picker can show what is selected). */
  const valueAt = (path: string): string | undefined => {
    const [target, ...rest] = path.split('.');
    let v: unknown = target === 'page' ? data : sections.find((x) => x.id === target)?.data;
    for (const part of rest) v = (v as Record<string, unknown> | undefined)?.[part];
    return typeof v === 'string' ? v : undefined;
  };
  /** A click on the site (or the Basic preview): select that section and jump to the field, or pick an image. */
  const onSelectPath = ({ path, key, image }: PreviewSelect) => {
    const target = path ? path.split('.')[0] : key;
    if (!target || (target !== 'page' && !sections.some((x) => x.id === target))) return;
    setSel(target);
    setSelPath(path);
    if (!path) return;
    if (fieldAt(path)?.type === 'icon' && canEdit) setPickingIcon(path);
    else if ((image || fieldAt(path)?.type === 'image' || fieldAt(path)?.type === 'video') && canEdit) setPicking(path);
    else focusPath(path);
  };

  /** Save keeps the status as it is; Publish saves and makes the page Published. */
  // The assistant's side of the page: its answer can arrive after more edits, so it reads the latest state from a ref.
  const live = useRef({ data, sections });
  live.current = { data, sections };
  /** Applies what the assistant proposed as unsaved edits and says what changed. Nothing is saved or published. */
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

  async function save(publish = false) {
    const next: Status = publish ? 'PUBLISHED' : status;
    setErr(''); setSaving(true); setSavedAt(false);
    try {
      const base = `/sites/${site.id}/entries`;
      const body = { slug: slug || null, data: isPage ? { ...data, sections } : data, status: next, contentTypeId: type.id };
      const saved = entry.id ? await api<Entry>(`${base}/${entry.id}`, { method: 'PUT', body }) : await api<Entry>(base, { body });
      if (publish) setStatus('PUBLISHED');
      setBaseline(snapshot(next));
      setSavedAt(true);
      setTimeout(() => setSavedAt(false), 2500);
      onSaved(saved);
    } catch (x) { setErr((x as Error).message); }
    setSaving(false);
  }

  const current = sel === 'page' ? null : sections.find((s) => s.id === sel);
  const currentDef = current ? def(current.type) : undefined;

  return (
    <div className="live-body">
      <Preview site={site} type={type} data={data} sections={isPage ? sections : undefined} sectionTypes={sectionTypes} slug={slug} status={status}
        selectedKey={sel === 'page' ? undefined : sel} selectedPath={selPath} onSelectPath={onSelectPath} />

      <aside className="panel">
        {canEdit && (
          <div className="panel-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'edit'} className={tab === 'edit' ? 'on' : ''} onClick={() => setTab('edit')}>Edit</button>
            <button role="tab" aria-selected={tab === 'ai'} className={tab === 'ai' ? 'on' : ''} onClick={() => setTab('ai')}>AI assistant</button>
          </div>
        )}
        {canEdit && (
          <AgentPanel site={site} typeSlug={type.slug} active={tab === 'ai'} apply={applyProposal} onPublish={publish}
            getDoc={() => ({ data: live.current.data, sections: live.current.sections, status })} />
        )}
        <div className="panel-top" hidden={tab !== 'edit'}>
          <div className="chips">
            <button className={`chip published${status === 'PUBLISHED' ? ' on' : ''}`} disabled={!canEdit} onClick={() => setStatus('PUBLISHED')}><i />Published</button>
            <button className={`chip draft${status === 'DRAFT' ? ' on' : ''}`} disabled={!canEdit} onClick={() => setStatus('DRAFT')}><i />Draft</button>
          </div>
          {isPage && (
            <select aria-label="What to edit" value={sel} onChange={(e) => { setSel(e.target.value); setSelPath(undefined); }}>
              <option value="page">Page settings</option>
              {sections.map((x, i) => <option key={x.id} value={x.id}>{i + 1}. {firstText(def(x.type), x.data) || def(x.type)?.name || x.type}</option>)}
            </select>
          )}
        </div>

        <div className="panel-body" hidden={tab !== 'edit'}>
          {current && currentDef ? (
            <>
              <p className="muted">{currentDef.name}</p>
              <FieldForm site={site} path={current.id} fields={currentDef.fields} data={current.data} disabled={!canEdit}
                onChange={(d) => setSections((l) => l.map((x) => (x.id === current.id ? { ...x, data: d } : x)))} />
            </>
          ) : (
            <>
              {isPage && <p className="muted">Page settings</p>}
              <FieldForm site={site} path="page" fields={type.fields} data={data} disabled={!canEdit} onChange={setData} />
              {!single && <div className="fld"><label className="lbl">Slug</label><input value={slug} disabled={!canEdit} onChange={(e) => setSlug(e.target.value)} placeholder={isPage ? 'home' : 'my-first-post'} /></div>}
            </>
          )}
          {isPage && !sections.length && <p className="muted">This page has no sections yet. Add them under Structure.</p>}
        </div>

        {canEdit && (
          <footer className="panel-foot">
            {err ? <span className="err">{err}</span> : dirty ? <span className="muted">Unsaved changes</span> : savedAt ? <span className="muted">Saved</span> : <span className="muted">No changes</span>}
            <button disabled={saving || !dirty} onClick={() => save()}>{saving ? 'Saving…' : 'Save'}</button>
            <button className="primary" disabled={saving || !dirty} onClick={publish}>Publish</button>
          </footer>
        )}
      </aside>

      {pickingIcon && <IconPicker site={site} value={valueAt(pickingIcon)} onClose={() => setPickingIcon(null)} onPick={(v) => { applyEdit(pickingIcon, v); setPickingIcon(null); }} />}
      {picking && <MediaPicker site={site} kind={fieldAt(picking)?.type === 'video' ? 'video' : 'image'} onClose={() => setPicking(null)} onPick={(url) => { applyEdit(picking, url); setPicking(null); }} />}
    </div>
  );
}
