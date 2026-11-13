import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ask } from '../lib/confirm';
import { api, type ContentType, type Entry, type Site } from '../api';
import { FieldForm } from './FieldInput';
import { PageBuilder } from './PageBuilder';
import { AgentPanel, type Applied, type Proposal } from './AgentPanel';
import { applyProposalTo, useAiOpen } from '../lib/assistant';
import { Chevron, iconFor } from './Icons';
import { setHistoryTarget } from '../lib/versions';
import { setSelectedDoc } from '../lib/selection';

type Status = 'DRAFT' | 'PUBLISHED';
type Draft = Partial<Entry> & { contentTypeId: string };
type View = { t: 'page'; id: string } | { t: 'new-page' } | { t: 'type'; typeId: string };


/** Pages are listed by their "order" field (lowest first) when the page type has one, otherwise in the order they were made. */
const pageOrder = (e: Entry) => { const n = Number((e.data as { order?: unknown }).order); return Number.isFinite(n) && (e.data as { order?: unknown }).order !== undefined && (e.data as { order?: unknown }).order !== '' ? n : 1e9; };
const byPageOrder = (x: Entry, y: Entry) => pageOrder(x) - pageOrder(y) || x.createdAt.localeCompare(y.createdAt);

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
  const [q, setQ] = useState(''); // the search box above the list
  const [folded, setFolded] = useState<Record<string, boolean>>({}); // pages that hold other pages: false = closed (open when not set)
  const [rk, setRk] = useState(0);
  // Live preview opens on the document picked here
  useEffect(() => {
    const key = view?.t === 'page' ? view.id : view?.t === 'type' ? (sel?.id ?? `type:${view.typeId}`) : undefined;
    if (key) setSelectedDoc(key);
  }, [view, sel?.id]); // bumped after a restore so the editor reloads the restored content
  const base = `/sites/${site.id}`;

  const reload = async () => { const list = await api<Entry[]>(`${base}/entries`); setEntries(list); return list; };

  useEffect(() => {
    Promise.all([api<ContentType[]>(`${base}/types`), api<Entry[]>(`${base}/entries`)]).then(([t, e]) => {
      setTypes(t);
      setEntries(e);
      const pageType = t.filter((x) => x.kind === 'page').map((x) => x.id);
      const firstPage = [...e].filter((x) => pageType.includes(x.contentTypeId)).sort(byPageOrder)[0];
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
    .sort(byPageOrder); // the page type's order, else creation order, never last-edited

  // Pages that are linked only from the footer (Contact, legal pages...) are listed under Footer, not with the main pages.
  // Which pages those are is worked out from the links in the Header and the Footer, so it follows them when they change.
  const linkedSlugs = (typeSlug: string) => {
    const out = new Set<string>();
    const t = types?.find((x) => x.slug === typeSlug);
    const doc = t ? entries.find((e) => e.contentTypeId === t.id) : undefined;
    for (const v of Object.values(doc?.data ?? {})) {
      if (!Array.isArray(v)) continue;
      for (const item of v) {
        const url = item && typeof item === 'object' ? (item as { url?: unknown }).url : undefined;
        if (typeof url === 'string' && url.startsWith('/')) out.add(url.slice(1).split(/[#?]/)[0] || 'home');
      }
    }
    return out;
  };
  const inHeader = linkedSlugs('header');
  const inFooter = linkedSlugs('footer');
  const footerPages = pages.filter((p) => !!p.slug && p.slug !== 'home' && inFooter.has(p.slug) && !inHeader.has(p.slug));
  const mainPages = pages.filter((p) => !footerPages.includes(p));
  const pagesOf = (slug: string) => (slug === 'footer' ? footerPages : []);
  // The tools in the menu's dropdown are listed under the page whose menu link opens it (Our Tools & Services)
  const headerDoc = (() => { const t = types?.find((x) => x.slug === 'header'); return t ? entries.find((e) => e.contentTypeId === t.id) : undefined; })();
  const slugOfUrl = (u: unknown) => (typeof u === 'string' && u.startsWith('/') ? u.slice(1).split(/[#?]/)[0] || 'home' : '');
  const headerLinks = (headerDoc?.data as { links?: unknown } | undefined)?.links;
  const headerDrop = (headerDoc?.data as { dropdown?: unknown } | undefined)?.dropdown;
  const dropParent = Array.isArray(headerLinks) ? slugOfUrl((headerLinks as { url?: unknown; hasDropdown?: unknown }[]).find((l) => l.hasDropdown)?.url) : '';
  const dropPages = Array.isArray(headerDrop) && dropParent ? (headerDrop as { url?: unknown }[]).map((d) => mainPages.find((p) => p.slug === slugOfUrl(d.url))).filter((p): p is Entry => !!p) : [];
  // the Header or Footer an open page is listed under (it stays lit in the left list, and the page gets a way back)
  const openedFrom = view?.t === 'page' ? (footerPages.some((p) => p.id === view.id) ? 'footer' : undefined) : undefined;
  const openedFromType = openedFrom ? types?.find((x) => x.slug === openedFrom) : undefined;
  const pageButton = (p: Entry, sub = false, tail?: ReactNode) => (
    <button key={p.id} className={`tree-item${view?.t === 'page' && view.id === p.id ? ' on' : ''}${sub ? ' sub' : ''}`} onClick={() => setView({ t: 'page', id: p.id })}>
      {iconFor(p.slug || titleOf(p, typeOf(p.contentTypeId)), 'page')}<span>{titleOf(p, typeOf(p.contentTypeId))}</span>
      {p.status === 'DRAFT' && <i className="dot draft" title="Draft, not live" />}
      {tail ?? <Chevron />}
    </button>
  );

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
  const needle = q.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(needle);
  const listButton = (t: ContentType) => (
    <button key={t.id} className={`tree-item${view?.t === 'type' && view.typeId === t.id ? ' on' : ''}`} onClick={() => openType(t)}>
      {iconFor(t.slug, 'collection')}<span>{t.name}</span><em className="tree-count">{entries.filter((e) => e.contentTypeId === t.id).length}</em><Chevron />
    </button>
  );
  const singleButton = (t: ContentType) => (
    <button key={t.id} className={`tree-item${(view?.t === 'type' && view.typeId === t.id) || t.slug === openedFrom ? ' on' : ''}`} onClick={() => openType(t)}>
      {iconFor(t.slug, 'singleton')}<span>{t.name}</span>{t.slug === 'footer' && footerPages.length > 0 && <em className="tree-count">{footerPages.length} pages</em>}<Chevron />
    </button>
  );
  // the page list: the tools sit under the page that opens them, and can be folded away
  const toolsOpen = folded[dropParent] !== false;
  const pageTree = mainPages.filter((p) => !dropPages.includes(p)).flatMap((p) => {
    if (p.slug !== dropParent || !dropPages.length) return [pageButton(p)];
    const toggle = () => setFolded((o) => ({ ...o, [dropParent]: !toolsOpen }));
    const tail = (
      <>
        <em className="tree-count">{dropPages.length}</em>
        <i
          className={`tree-fold${toolsOpen ? ' open' : ''}`} role="button" tabIndex={0} aria-expanded={toolsOpen}
          aria-label={toolsOpen ? 'Hide the pages under this one' : 'Show the pages under this one'}
          onClick={(e) => { e.stopPropagation(); toggle(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggle(); } }}
        ><Chevron /></i>
      </>
    );
    return [pageButton(p, false, tail), ...(toolsOpen ? dropPages.map((c) => pageButton(c, true)) : [])];
  });
  // searching shows one flat list of everything that matches, including the pages kept under Footer
  const found = needle
    ? [
        ...pages.filter((p) => matches(titleOf(p, typeOf(p.contentTypeId))) || matches(p.slug ?? '')).map((p) => pageButton(p)),
        ...lists.filter((t) => matches(t.name)).map(listButton),
        ...singles.filter((t) => matches(t.name)).map(singleButton),
      ]
    : [];
  // Header and Footer open a column of their own: the document, its images and icons, and the pages linked from it
  const container = activeType && (activeType.slug === 'header' || activeType.slug === 'footer') ? activeType : undefined;
  const containerDoc = container ? entries.find((e) => e.contentTypeId === container.id) : undefined;
  const containerImages = (container?.fields ?? []).filter((fl) => fl.type === 'image' || fl.type === 'icon');
  const showContainer = !!container && (pagesOf(container.slug).length > 0 || containerImages.length > 0);
  const fieldTitle = (fl: { name: string; label?: string }) => fl.label || (() => { const w = fl.name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase(); return w.charAt(0).toUpperCase() + w.slice(1); })();
  const showField = (name: string) => {
    const el = document.querySelector<HTMLElement>(`[data-field-path="page.${name}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('fld-flash');
    setTimeout(() => el.classList.remove('fld-flash'), 1400);
  };
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
        <div className="tree-search">
          <svg className="ts-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input type="search" placeholder="Search pages and content" aria-label="Search pages and content" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <button className="ts-clear" onClick={() => setQ('')} aria-label="Clear search"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg></button>}
        </div>
        {needle ? (
          <div className="tree-group">{found.length ? found : <p className="muted pad">Nothing matches "{q.trim()}".</p>}</div>
        ) : (
          <>
            <div className="tree-label"><span>Pages</span><em>{pages.length}</em></div>
            <div className="tree-group">
              {pageTypes.length > 0 && !pages.length && <p className="muted pad">No pages yet. Use + to add one.</p>}
              {pageTree}
            </div>
            {lists.length > 0 && (
              <>
                <div className="tree-label"><span>Collections</span></div>
                <div className="tree-group">{lists.map(listButton)}</div>
              </>
            )}
            {singles.length > 0 && (
              <>
                <div className="tree-label"><span>Site</span></div>
                <div className="tree-group">{singles.map(singleButton)}</div>
              </>
            )}
          </>
        )}
      </section>

      {pageType && (view?.t === 'page' || view?.t === 'new-page') && (
        <PageBuilder
          key={(view.t === 'page' ? view.id : 'new-page') + ':' + rk}
          site={site} type={pageType} sectionTypes={sectionTypes} canEdit={canEdit}
          entry={pageEntry ?? { contentTypeId: pageType.id, data: {}, status: 'DRAFT' }}
          onSaved={async (saved) => { await reload(); setView({ t: 'page', id: saved.id }); }}
          onDeleted={async () => { const list = await reload(); const next = list.find((e) => pageTypes.some((t) => t.id === e.contentTypeId)); setView(next ? { t: 'page', id: next.id } : null); }}
          onRestored={async () => { await reload(); setRk((k) => k + 1); }}
          back={openedFromType ? { label: openedFromType.name, onClick: () => openType(openedFromType) } : undefined}
        />
      )}

      {showContainer && container && (
        <section className="pane pane-list">
          <div className="pane-head"><h2 className="pane-title">{container.name}</h2></div>
          <button className="doc-row on">
            {iconFor(container.slug, 'singleton')}<span className="doc-title">{container.name}</span><span className="muted">links and text</span>
          </button>
          {containerImages.length > 0 && <p className="col-label">Images and icons</p>}
          {containerImages.map((fl) => {
            const v = containerDoc?.data[fl.name];
            const url = typeof v === 'string' ? v : '';
            return (
              <button key={fl.name} className="doc-row" onClick={() => showField(fl.name)}>
                {url ? <img className="doc-thumb" src={url} alt="" /> : <span className="doc-thumb empty" />}
                <span className="doc-title">{fieldTitle(fl)}</span>{!url && <span className="muted">not set</span>}
              </button>
            );
          })}
          {pagesOf(container.slug).length > 0 && <p className="col-label">Pages in the {container.name.toLowerCase()}</p>}
          {pagesOf(container.slug).map((p) => (
            <button key={p.id} className="doc-row" onClick={() => setView({ t: 'page', id: p.id })}>
              {iconFor(p.slug || titleOf(p, typeOf(p.contentTypeId)), 'page')}<span className="doc-title">{titleOf(p, typeOf(p.contentTypeId))}</span>
              {p.status === 'DRAFT' && <span className="dot draft" title="Draft, not live" />}
            </button>
          ))}
        </section>
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
              {/* the filter above already says which status this is, so the dot only shows when the list mixes both */}
              {filter === 'ALL' ? <span className={`dot ${e.status.toLowerCase()}`} title={e.status.toLowerCase()} /> : <span />}
              <span className="muted doc-date">{new Date(e.updatedAt).toLocaleDateString()}</span>
            </button>
          ))}
        </section>
      )}

      {activeType && (
        <section className="pane pane-editor">
          {sel ? (
            <Editor
              key={(sel.id ?? 'new') + activeType.id + ':' + rk}
              site={site} type={activeType} entry={sel} canEdit={canEdit}
              onSaved={async (saved) => { await reload(); setSel(saved); }}
              onDeleted={async () => { await reload(); setSel(null); }}
              onRestored={async (e) => { await reload(); setSel(e); setRk((k) => k + 1); }}
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

function Editor({ site, type, entry, canEdit, onSaved, onDeleted, onRestored }: {
  site: Site; type: ContentType; entry: Draft; canEdit: boolean;
  onSaved: (e: Entry) => void; onDeleted: () => void; onRestored: (e: Entry) => void;
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

  // The Version history button in the top bar works on this document
  const versionRef = useRef({ name: heading, onRestored });
  versionRef.current = { name: heading, onRestored };
  useEffect(() => {
    if (!entry.id) return;
    setHistoryTarget({ entryId: entry.id, canEdit, get name() { return versionRef.current.name; }, onRestored: (e) => versionRef.current.onRestored(e) });
    return () => setHistoryTarget(null);
  }, [entry.id, canEdit]);
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
          <span className={`chip static ${status === 'PUBLISHED' ? 'published' : 'draft'} on`}><i />{status === 'PUBLISHED' ? 'Published' : 'Draft'}</span>
{canEdit && status === 'PUBLISHED' && <button className="link unpublish" onClick={() => setStatus('DRAFT')}>Unpublish</button>}
        </div>
        <div className="grow" />
        {canEdit && entry.id && !single && <button className="link delete-link" onClick={async () => { if (await ask({ title: 'Delete this document?', message: 'It is removed permanently and cannot be undone.', confirmLabel: 'Delete' })) { await api(`${base}/${entry.id}`, { method: 'DELETE' }); onDeleted(); } }}>Delete</button>}
        {canEdit && <button className={dirty ? 'dirty' : ''} title={dirty ? 'You have unsaved changes' : undefined} disabled={saving || !dirty} onClick={() => save()}>{saving ? 'Saving…' : 'Save'}</button>}
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
