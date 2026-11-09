import { useEffect, useRef, useState } from 'react';
import { ask } from '../lib/confirm';
import { api, type ContentType, type Entry, type Site } from '../api';
import { FieldForm } from './FieldInput';
import { PageBuilder } from './PageBuilder';
import { AgentPanel, type Applied, type Proposal } from './AgentPanel';
import { applyProposalTo, useAiOpen } from '../lib/assistant';
import { Chevron, iconFor } from './Icons';

type Status = 'DRAFT' | 'PUBLISHED';
type Draft = Partial<Entry> & { contentTypeId: string };
type View = { t: 'page'; id: string } | { t: 'new-page' } | { t: 'type'; typeId: string };


const titleOf = (e: Partial<Entry>, t?: ContentType) => {
  const f = t?.fields.find((x) => x.type === 'text');
  return (f && (e.data?.[f.name] as string)) || e.slug || 'Untitled';
};

/**
 * Three-column workspace.
 *   Column 1: Pages, then the other content (lists and single documents).
 *   Column 2: a page's sections (Page Builder), or a list's documents.
 *   Column 3: the editor for the selected section, page or document.
 * In Presentation mode the editor sits next to a large live preview.
 */
export function Structure({ site, canEdit, goTypes }: { site: Site; canEdit: boolean; goTypes: () => void }) {
  const [types, setTypes] = useState<ContentType[] | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [view, setView] = useState<View | null>(null);
  const [sel, setSel] = useState<Draft | null>(null); // selected document of a list
  const [filter, setFilter] = useState<'ALL' | Status>('ALL');
  const base = `/sites/${site.id}`;

  const reload = async () => { const list = await api<Entry[]>(`${base}/entries`); setEntries(list); return list; };

  useEffect(() => {
    Promise.all([api<ContentType[]>(`${base}/types`), api<Entry[]>(`${base}/entries`)]).then(([t, e]) => {
      setTypes(t);
      setEntries(e);
      const pageType = t.filter((x) => x.kind === 'page').map((x) => x.id);
      const firstPage = [...e].filter((x) => pageType.includes(x.contentTypeId)).sort((p, q) => p.createdAt.localeCompare(q.createdAt))[0];
      const firstContent = t.find((x) => x.kind !== 'page' && x.kind !== 'section');
      setView(firstPage ? { t: 'page', id: firstPage.id } : firstContent ? { t: 'type', typeId: firstContent.id } : null);
    });
  }, [site.id]);

  const pageTypes = types?.filter((t) => t.kind === 'page') ?? [];
  const sectionTypes = types?.filter((t) => t.kind === 'section') ?? [];
  const contentTypes = types?.filter((t) => t.kind !== 'page' && t.kind !== 'section') ?? [];
  const lists = contentTypes.filter((t) => t.kind !== 'singleton');
  const singles = contentTypes.filter((t) => t.kind === 'singleton');
  const typeOf = (id: string) => types?.find((t) => t.id === id);
  const pages = entries
    .filter((e) => pageTypes.some((t) => t.id === e.contentTypeId))
    .sort((x, y) => x.createdAt.localeCompare(y.createdAt)); // creation order, not last-edited

  // Selecting a list type clears the selected document; a single document opens straight away.
  const openType = (t: ContentType) => {
    setView({ t: 'type', typeId: t.id });
    setFilter('ALL');
    setSel(t.kind === 'singleton' ? entries.find((e) => e.contentTypeId === t.id) ?? { contentTypeId: t.id, data: {}, status: 'DRAFT' } : null);
  };

  if (types && !types.some((t) => t.kind !== 'section')) {
    return (
      <div className="empty">
        <h2>No content yet</h2>
        <p className="muted">Create a Page type (for example "Pages") and some Section blocks (Hero, Text...), then build pages from them. Lists such as Articles and single documents such as Header or Footer work too.</p>
        <button className="primary" onClick={goTypes}>Create a content type</button>
      </div>
    );
  }
  if (!types) return null;

  const activeType = view?.t === 'type' ? typeOf(view.typeId) : undefined;
  const isList = activeType && activeType.kind !== 'singleton';
  const listDocs = isList ? entries.filter((e) => e.contentTypeId === activeType.id && (filter === 'ALL' || e.status === filter)) : [];
  const pageEntry = view?.t === 'page' ? entries.find((e) => e.id === view.id) : undefined;
  const pageType = view?.t === 'page' ? typeOf(pageEntry?.contentTypeId ?? '') : view?.t === 'new-page' ? pageTypes[0] : undefined;

  return (
    <div className="workspace">
      <section className="pane pane-tree">
        <div className="pane-head">
          <h2 className="pane-title">Content</h2>
          {canEdit && pageTypes.length > 0 && <button className="icon-btn" title="New page" aria-label="New page" onClick={() => setView({ t: 'new-page' })}>+</button>}
        </div>
        <div className="tree-group">
          {pageTypes.length > 0 && !pages.length && <p className="muted pad">No pages yet. Use + to add one.</p>}
          {pages.map((p) => (
            <button key={p.id} className={`tree-item${view?.t === 'page' && view.id === p.id ? ' on' : ''}`} onClick={() => setView({ t: 'page', id: p.id })}>
              {iconFor(p.slug || titleOf(p, typeOf(p.contentTypeId)), 'page')}<span>{titleOf(p, typeOf(p.contentTypeId))}</span><Chevron />
            </button>
          ))}
          {lists.map((t) => (
            <button key={t.id} className={`tree-item${view?.t === 'type' && view.typeId === t.id ? ' on' : ''}`} onClick={() => openType(t)}>
              {iconFor(t.slug, 'collection')}<span>{t.name}</span><Chevron />
            </button>
          ))}
        </div>
        {singles.length > 0 && (
          <>
            <div className="tree-divider" />
            <div className="tree-group">
              {singles.map((t) => (
                <button key={t.id} className={`tree-item${view?.t === 'type' && view.typeId === t.id ? ' on' : ''}`} onClick={() => openType(t)}>
                  {iconFor(t.slug, 'singleton')}<span>{t.name}</span><Chevron />
                </button>
              ))}
            </div>
            <div className="tree-divider" />
          </>
        )}
      </section>

      {pageType && (view?.t === 'page' || view?.t === 'new-page') && (
        <PageBuilder
          key={view.t === 'page' ? view.id : 'new-page'}
          site={site} type={pageType} sectionTypes={sectionTypes} canEdit={canEdit}
          entry={pageEntry ?? { contentTypeId: pageType.id, data: {}, status: 'DRAFT' }}
          onSaved={async (saved) => { await reload(); setView({ t: 'page', id: saved.id }); }}
          onDeleted={async () => { const list = await reload(); const next = list.find((e) => pageTypes.some((t) => t.id === e.contentTypeId)); setView(next ? { t: 'page', id: next.id } : null); }}
        />
      )}

      {isList && (
        <section className="pane pane-list">
          <div className="pane-head">
            <h2 className="pane-title">{activeType.name}</h2>
            {canEdit && <button className="primary" onClick={() => setSel({ contentTypeId: activeType.id, data: {}, status: 'DRAFT' })}>New</button>}
          </div>
          <div className="chips">
            {(['ALL', 'PUBLISHED', 'DRAFT'] as const).map((f) => (
              <button key={f} className={`chip ${f.toLowerCase()}${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
                {f !== 'ALL' && <i />}{f === 'ALL' ? 'All' : f === 'PUBLISHED' ? 'Published' : 'Draft'}
              </button>
            ))}
          </div>
          {!listDocs.length && <p className="muted pad">{filter === 'ALL' ? 'No documents yet.' : 'Nothing matches this filter.'}</p>}
          {listDocs.map((e) => (
            <button key={e.id} className={`doc-row${sel?.id === e.id ? ' on' : ''}`} onClick={() => setSel(e)}>
              <span className="doc-title">{titleOf(e, activeType)}</span>
              <span className={`dot ${e.status.toLowerCase()}`} title={e.status.toLowerCase()} />
              <span className="muted doc-date">{new Date(e.updatedAt).toLocaleDateString()}</span>
            </button>
          ))}
        </section>
      )}

      {activeType && (
        <section className="pane pane-editor">
          {sel ? (
            <Editor
              key={(sel.id ?? 'new') + activeType.id}
              site={site} type={activeType} entry={sel} canEdit={canEdit}
              onSaved={async (saved) => { await reload(); setSel(saved); }}
              onDeleted={async () => { await reload(); setSel(null); }}
            />
          ) : (
            <p className="muted pad">{isList ? 'Select a document, or create a new one.' : ''}</p>
          )}
        </section>
      )}

      {!view && <section className="pane pane-editor"><p className="muted pad">Select something on the left.</p></section>}
    </div>
  );
}

function Editor({ site, type, entry, canEdit, onSaved, onDeleted }: {
  site: Site; type: ContentType; entry: Draft; canEdit: boolean;
  onSaved: (e: Entry) => void; onDeleted: () => void;
}) {
  const [data, setData] = useState<Record<string, unknown>>(entry.data ?? {});
  const [slug, setSlug] = useState(entry.slug ?? '');
  const [status, setStatus] = useState<Status>(entry.status ?? 'DRAFT');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  // The save button only shows when something has changed since the last save.
  const snapshot = (st = status) => JSON.stringify([data, slug, st]);
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot() !== baseline;
  const base = `/sites/${site.id}/entries`;
  const single = type.kind === 'singleton';

  /** Save keeps the status as it is; Publish saves and makes the document Published. */
  async function save(publish = false) {
    const next = publish ? 'PUBLISHED' : status;
    setErr(''); setSaving(true);
    try {
      const body = { slug: slug || null, data, status: next, contentTypeId: type.id };
      const saved = entry.id ? await api<Entry>(`${base}/${entry.id}`, { method: 'PUT', body }) : await api<Entry>(base, { body });
      if (publish) setStatus('PUBLISHED');
      setBaseline(snapshot(next));
      onSaved(saved);
    } catch (x) { setErr((x as Error).message); }
    setSaving(false);
  }

  const heading = single ? type.name : titleOf({ data, slug }, type) === 'Untitled' ? `New ${type.name}` : titleOf({ data, slug }, type);
  const form = (
    <div className="editor-form">
      <FieldForm site={site} path="page" fields={type.fields} data={data} onChange={setData} disabled={!canEdit} />
      {!single && <div className="fld"><label className="lbl">Slug (optional)</label><input value={slug} disabled={!canEdit} onChange={(e) => setSlug(e.target.value)} placeholder="my-first-post" /></div>}
      {err && <p className="err">{err}</p>}
    </div>
  );

  const [aiOpen, toggleAi] = useAiOpen();
  const live = useRef({ data });
  live.current = { data };
  const applyProposal = (p: Proposal): Applied => {
    const before = live.current.data;
    const r = applyProposalTo({ data: before, sections: [] }, p, type.name, type.fields, []);
    setData(r.data);
    return { lines: r.lines, changes: r.changes, undo: () => setData(before) };
  };
  const publish = async () => {
    if (await ask({ title: 'Publish changes?', message: 'They go live on the site right away.', confirmLabel: 'Publish', tone: 'primary' })) save(true);
  };

  return (
    <>
    <div className="editor">
      <header className="editor-bar">
        <h2>{heading}</h2>
        <div className="chips">
          <button className={`chip published${status === 'PUBLISHED' ? ' on' : ''}`} disabled={!canEdit} onClick={() => setStatus('PUBLISHED')}><i />Published</button>
          <button className={`chip draft${status === 'DRAFT' ? ' on' : ''}`} disabled={!canEdit} onClick={() => setStatus('DRAFT')}><i />Draft</button>
        </div>
        <div className="grow" />
        {canEdit && <button className={`ai-toggle${aiOpen ? ' on' : ''}`} aria-pressed={aiOpen} onClick={toggleAi}>✦ AI assistant</button>}
        {canEdit && entry.id && !single && <button className="link delete-link" onClick={async () => { if (await ask({ title: 'Delete this document?', message: 'It is removed permanently and cannot be undone.', confirmLabel: 'Delete' })) { await api(`${base}/${entry.id}`, { method: 'DELETE' }); onDeleted(); } }}>Delete</button>}
        {canEdit && dirty && !saving && <span className="muted">Unsaved changes</span>}
        {canEdit && <button disabled={saving || !dirty} onClick={() => save()}>{saving ? 'Saving…' : 'Save'}</button>}
        {canEdit && <button className="primary" disabled={saving || !dirty} onClick={async () => { if (await ask({ title: 'Publish changes?', message: 'They go live on the site right away.', confirmLabel: 'Publish', tone: 'primary' })) save(true); }}>Publish</button>}
      </header>
      <div className="editor-scroll">{form}</div>
    </div>
    {canEdit && (
      <aside className="ai-drawer" hidden={!aiOpen}>
        <AgentPanel site={site} typeSlug={type.slug} active={aiOpen} onClose={toggleAi} apply={applyProposal} onPublish={publish}
          getDoc={() => ({ data: live.current.data, sections: [], status })} />
      </aside>
    )}
    </>
  );
}
