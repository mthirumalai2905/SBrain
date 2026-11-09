import { useEffect, useRef, useState } from 'react';
import type { ContentType, Field, Section, Site } from '../api';

/** A click in the preview: a field (`path`, e.g. "page.title" or "<sectionId>.items.1.text") or a whole section (`key`). */
export interface PreviewSelect { path?: string; key?: string; image?: boolean }

interface Props {
  site: Site;
  type: ContentType;
  /** The document's own fields. */
  data: Record<string, unknown>;
  /** Page types only: the ordered sections. */
  sections?: Section[];
  slug: string;
  status: 'DRAFT' | 'PUBLISHED';
  /** Section block definitions, so a page's sections can be labelled and rendered. */
  sectionTypes?: ContentType[];
  selectedKey?: string;
  selectedPath?: string;
  onSelectPath?: (sel: PreviewSelect) => void;
}

type Mode = 'basic' | 'site';

const Refresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></svg>
);
const External = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
);
const Phone = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></svg>
);

/** Where this document lives on the site: home is "/", other pages "/<slug>", anything else the site root. */
function siteUrlFor(base: string, type: ContentType, slug: string) {
  const root = base.replace(/\/$/, '');
  return type.kind === 'page' && slug && slug !== 'home' ? `${root}/${slug}` : `${root}/`;
}

/**
 * Live preview, like Sanity's Presentation tool: your site (or a simple built-in view) next to the editing
 * panel. With Edit on, clicking text or an image on the page selects that field in the panel. Changes in the
 * panel show up here as you type.
 */
export function Preview({ site, type, data, sections, slug, status, sectionTypes, selectedKey, selectedPath, onSelectPath }: Props) {
  const [mode, setMode] = useState<Mode>(site.previewUrl ? 'site' : 'basic');
  const [mobile, setMobile] = useState(false);
  const [edit, setEdit] = useState(true);
  const [reload, setReload] = useState(0);
  const url = site.previewUrl ? siteUrlFor(site.previewUrl, type, slug) : null;

  return (
    <div className="preview">
      <div className="pv-bar">
        <button role="switch" aria-checked={edit} className={`switch${edit ? ' on' : ''}`} onClick={() => setEdit(!edit)} title="Turn click-to-edit on or off">
          <i /><span>Edit</span>
        </button>
        <input className="pv-url" readOnly value={mode === 'site' ? url ?? 'Set a Preview URL in Settings' : 'Built-in preview'} aria-label="Preview address" />
        <button className="icon-btn" title="Reload the site" aria-label="Reload" disabled={mode !== 'site' || !url} onClick={() => setReload(reload + 1)}><Refresh /></button>
        {url && <a className="icon-btn" href={url} target="_blank" rel="noopener noreferrer" title="Open the site in a new tab" aria-label="Open in a new tab"><External /></a>}
        <button className={`icon-btn${mobile ? ' on' : ''}`} title="Mobile width" aria-label="Mobile width" aria-pressed={mobile} onClick={() => setMobile(!mobile)}><Phone /></button>
        <div className="seg">
          <button className={mode === 'site' ? 'on' : ''} onClick={() => setMode('site')} title={site.previewUrl ? '' : 'Set a Preview URL in Settings'}>Site</button>
          <button className={mode === 'basic' ? 'on' : ''} onClick={() => setMode('basic')}>Basic</button>
        </div>
      </div>
      <div className={`preview-stage${mobile ? ' mobile' : ''}`}>
        {mode === 'site' ? (
          url
            ? <SiteFrame key={`${url}#${reload}`} url={url} type={type} data={data} sections={sections} slug={slug} status={status} edit={edit} selectedKey={selectedKey} selectedPath={selectedPath} onSelectPath={onSelectPath} />
            : <p className="muted pad">Add a Preview URL for this site under Settings to see your real site here. Until then, use the Basic preview.</p>
        ) : (
          <Basic type={type} data={data} sections={sections} sectionTypes={sectionTypes} status={status} edit={edit} selectedKey={selectedKey} selectedPath={selectedPath} onSelectPath={onSelectPath} />
        )}
      </div>
    </div>
  );
}

function SiteFrame({ url, type, data, sections, slug, status, edit, selectedKey, selectedPath, onSelectPath }:
  { url: string; edit: boolean } & Omit<Props, 'site' | 'sectionTypes'>) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const origin = (() => { try { return new URL(url).origin; } catch { return null; } })();
  const latest = useRef({ type, data, sections, slug, status, edit, selectedKey, selectedPath });
  latest.current = { type, data, sections, slug, status, edit, selectedKey, selectedPath };
  const onSelect = useRef(onSelectPath);
  onSelect.current = onSelectPath;

  const send = () => {
    if (!origin) return;
    const c = latest.current;
    const entry: Record<string, unknown> = { slug: c.slug || null, ...c.data };
    if (c.type.kind === 'page') entry.sections = (c.sections ?? []).map((s) => ({ _key: s.id, _type: s.type, ...s.data }));
    frame.current?.contentWindow?.postMessage(
      { source: 'synx-cms', kind: 'preview', contentType: c.type.slug, status: c.status, editable: c.edit, selectedKey: c.selectedKey ?? null, selectedPath: c.selectedPath ?? null, entry },
      origin,
    );
  };

  // Debounced push on every change (typing in the panel, reordering, selecting...).
  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(send, 120);
    return () => clearTimeout(id);
  }, [loaded, type.slug, data, sections, slug, status, edit, selectedKey, selectedPath]);

  // Messages from the site: it is ready, or the editor clicked something.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== origin || e.source !== frame.current?.contentWindow || e.data?.source !== 'synx-site') return;
      if (e.data.kind === 'ready') send();
      if (e.data.kind === 'select') {
        const { path, key, image } = e.data as { path?: unknown; key?: unknown; image?: unknown };
        onSelect.current?.({ path: typeof path === 'string' ? path : undefined, key: typeof key === 'string' ? key : undefined, image: image === true });
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [origin]);

  if (!origin) return <p className="err pad">The Preview URL is not valid.</p>;
  return <iframe ref={frame} src={url} title="Site preview" onLoad={() => setLoaded(true)} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />;
}

const isUrl = (v: string) => /^(https?:\/\/|\/)/i.test(v);

interface BasicProps {
  type: ContentType; data: Record<string, unknown>; sections?: Section[]; sectionTypes?: ContentType[]; status: string; edit: boolean;
  selectedKey?: string; selectedPath?: string; onSelectPath?: (sel: PreviewSelect) => void;
}

/** A simple page built from the fields. Clicking a value selects its field, just like the real site does. */
function Basic({ type, data, sections, sectionTypes, status, edit, selectedKey, selectedPath, onSelectPath }: BasicProps) {
  const titleField = type.fields.find((f) => f.type === 'text');

  const pick = (sel: PreviewSelect) => (e: React.MouseEvent) => { if (!edit || !onSelectPath) return; e.stopPropagation(); onSelectPath(sel); };
  const cls = (path: string) => `pv-click${edit ? ' on' : ''}${selectedPath === path ? ' sel' : ''}`;

  const view = (f: Field, v: unknown, path: string): React.ReactNode => {
    const empty = v === undefined || v === null || v === '';
    // Empty text and image fields stay visible and clickable, so an editor can fill them in.
    if (empty && f.type !== 'image' && f.type !== 'video' && f.type !== 'text' && f.type !== 'textarea' && f.type !== 'richtext') return null;
    if (empty && f.type !== 'array') {
      return (
        <div key={path} className={cls(path)} onClick={pick({ path, image: f.type === 'image' })}>
          <div className="lbl">{f.label || f.name}</div>
          <p className="pv-empty">{f.type === 'image' ? 'Click to add an image' : f.type === 'video' ? 'Click to add a video' : 'Empty. Click to edit'}</p>
        </div>
      );
    }
    if (f.type === 'array' && Array.isArray(v)) {
      return (
        <div key={path} className="pv-array">
          <div className="lbl">{f.label || f.name}</div>
          {(v as Record<string, unknown>[]).map((it, i) => (
            <div key={i} className="pv-item">{(f.fields ?? []).map((sf) => view(sf, it?.[sf.name], `${path}.${i}.${sf.name}`))}</div>
          ))}
        </div>
      );
    }
    return (
      <div key={path} className={cls(path)} onClick={pick({ path, image: f.type === 'image' })}>
        <div className="lbl">{f.label || f.name}</div>
        {f.type === 'image' ? (typeof v === 'string' && isUrl(v) ? <img src={v} alt="" /> : null)
          : f.type === 'color' ? <p className="text"><i className="swatch" style={{ background: String(v) }} />{String(v)}</p>
          : f.type === 'video' ? (typeof v === 'string' && isUrl(v) ? <video src={v} muted loop autoPlay playsInline /> : null)
          : f.type === 'boolean' ? <p>{v ? 'Yes' : 'No'}</p>
          : f.type === 'json' ? <pre>{JSON.stringify(v, null, 2)}</pre>
          : f.type === 'date' ? <p>{new Date(String(v)).toLocaleDateString()}</p>
          : <p className="text">{String(v)}</p>}
      </div>
    );
  };

  return (
    <article className="basic">
      <span className={`pill ${status.toLowerCase()}`}>{status.toLowerCase()}</span>
      {titleField && (
        <h1 className={cls(`page.${titleField.name}`)} onClick={pick({ path: `page.${titleField.name}` })}>
          {String(data[titleField.name] ?? '') || <span className="muted">Untitled</span>}
        </h1>
      )}
      {type.fields.filter((f) => f !== titleField).map((f) => view(f, data[f.name], `page.${f.name}`))}
      {(sections ?? []).map((s) => {
        const def = sectionTypes?.find((t) => t.slug === s.type);
        return (
          <section key={s.id} className={`sec-card${selectedKey === s.id ? ' sel' : ''}`} onClick={pick({ key: s.id })}>
            <div className="lbl">{def?.name ?? s.type}</div>
            {(def?.fields ?? []).map((f) => view(f, s.data[f.name], `${s.id}.${f.name}`))}
          </section>
        );
      })}
    </article>
  );
}
