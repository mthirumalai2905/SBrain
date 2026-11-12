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
  /** The site opened another of its pages (a link was clicked in the preview): the path, such as "/dns". */
  onNavigate?: (path: string) => void;
}

const Refresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></svg>
);
const External = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
);
const Desktop = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
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
export function Preview({ site, type, data, sections, slug, status, selectedKey, selectedPath, onSelectPath, onNavigate }: Props) {
  const [mobile, setMobile] = useState(false); // Desktop (the full width) or Mobile (a phone-sized frame)
  const [edit, setEdit] = useState(true);
  const [reload, setReload] = useState(0);
  const url = site.previewUrl ? siteUrlFor(site.previewUrl, type, slug) : null;

  return (
    <div className="preview">
      <div className="pv-bar">
        <button role="switch" aria-checked={edit} className={`switch${edit ? ' on' : ''}`} onClick={() => setEdit(!edit)} title="Turn click-to-edit on or off">
          <i /><span>Edit</span>
        </button>
        <input className="pv-url" readOnly value={url ?? 'Set a Preview URL in Settings'} aria-label="Preview address" />
        <button className="icon-btn" title="Reload the site" aria-label="Reload" disabled={!url} onClick={() => setReload(reload + 1)}><Refresh /></button>
        {url && <a className="icon-btn" href={url} target="_blank" rel="noopener noreferrer" title="Open the site in a new tab" aria-label="Open in a new tab"><External /></a>}
        <div className="seg" role="group" aria-label="Preview size">
          <button className={!mobile ? 'on' : ''} aria-pressed={!mobile} onClick={() => setMobile(false)}><Desktop />Desktop</button>
          <button className={mobile ? 'on' : ''} aria-pressed={mobile} onClick={() => setMobile(true)}><Phone />Mobile</button>
        </div>
      </div>
      <div className={`preview-stage${mobile ? ' mobile' : ''}`}>
        {url
          ? <SiteFrame key={`${url}#${reload}`} url={url} type={type} data={data} sections={sections} slug={slug} status={status} edit={edit} selectedKey={selectedKey} selectedPath={selectedPath} onSelectPath={onSelectPath} onNavigate={onNavigate} />
          : <p className="muted pad">Add a Preview URL for this site under Settings to see your real site here.</p>}
      </div>
    </div>
  );
}

function SiteFrame({ url, type, data, sections, slug, status, edit, selectedKey, selectedPath, onSelectPath, onNavigate }:
  { url: string; edit: boolean } & Omit<Props, 'site' | 'sectionTypes'>) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const origin = (() => { try { return new URL(url).origin; } catch { return null; } })();
  const latest = useRef({ type, data, sections, slug, status, edit, selectedKey, selectedPath });
  latest.current = { type, data, sections, slug, status, edit, selectedKey, selectedPath };
  const onSelect = useRef(onSelectPath);
  onSelect.current = onSelectPath;
  const onGo = useRef(onNavigate);
  onGo.current = onNavigate;

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
      if (e.data.kind === 'navigate' && typeof e.data.path === 'string') onGo.current?.(e.data.path);
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
