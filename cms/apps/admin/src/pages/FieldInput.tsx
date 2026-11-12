import { useEffect, useState, type ReactNode } from 'react';
import { api, type Field, type Media, type Site } from '../api';
import { MediaPicker } from './MediaPicker';
import { IconField } from './IconPicker';
import { ask } from '../lib/confirm';

/** Renders the form for a list of fields. */
/** `path` addresses each field in the page ("page" or a section id), so a click on the site can find it. */
export function FieldForm({ site, fields, data, onChange, disabled, path }: {
  site: Site; fields: Field[]; data: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void; disabled?: boolean; path?: string;
}) {
  const row = (f: Field) => (
    <div className="fld" key={f.name} data-field-path={path ? `${path}.${f.name}` : undefined}>
      <label className="lbl">{f.label || f.name}{f.required && ' *'}</label>
      <FieldInput site={site} f={f} path={path ? `${path}.${f.name}` : undefined} value={data[f.name]} onChange={(v) => onChange({ ...data, [f.name]: v })} />
    </div>
  );
  // Fields that name the same group, one after the other, sit together under one heading. The heading is the value of the group's field whose name ends in Title (so a footer column is headed by its own title), otherwise the group's name.
  const blocks: ReactNode[] = [];
  for (let i = 0; i < fields.length;) {
    const g = fields[i].group;
    if (!g) { blocks.push(row(fields[i])); i += 1; continue; }
    const members: Field[] = [];
    while (i < fields.length && fields[i].group === g) { members.push(fields[i]); i += 1; }
    const lead = members.find((m) => m.type === 'text' && /Title$/.test(m.name));
    const named = lead && typeof data[lead.name] === 'string' ? (data[lead.name] as string).trim() : '';
    blocks.push(<details className="fld-group" key={`group:${g}`} open><summary>{named || g}</summary>{members.map(row)}</details>);
  }
  return <fieldset disabled={disabled}>{blocks}</fieldset>;
}

export function FieldInput({ site, f, value, onChange, path }: { site: Site; f: Field; value: unknown; onChange: (v: unknown) => void; path?: string }) {
  const s = (value as string | undefined) ?? '';
  switch (f.type) {
    case 'textarea':
    case 'richtext':
      return <textarea rows={f.type === 'richtext' ? 10 : 4} value={s} onChange={(e) => onChange(e.target.value)} />;
    case 'number':
      return <input type="number" value={(value as number | undefined) ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />;
    case 'boolean':
      return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />;
    case 'date':
      return <input type="date" value={s.slice(0, 10)} onChange={(e) => onChange(e.target.value)} />;
    case 'select':
      return <select value={s} onChange={(e) => onChange(e.target.value)}><option value="">{f.required ? "Choose…" : "None"}</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</select>;
    case 'json':
      return <textarea rows={6} defaultValue={value === undefined ? '' : JSON.stringify(value, null, 2)} onBlur={(e) => { try { onChange(e.target.value ? JSON.parse(e.target.value) : null); } catch { alert('Invalid JSON'); } }} />;
    case 'image':
      return <ImagePicker site={site} value={s} onChange={onChange} />;
    case 'icon':
      return <IconField site={site} value={s} onChange={onChange} />;
    case 'color':
      return <ColorField value={s} onChange={onChange} />;
    case 'video':
      return <VideoPicker site={site} value={s} onChange={onChange} />;
    case 'array':
      return <ArrayField site={site} f={f} value={value} onChange={onChange} path={path} />;
    default:
      return <input value={s} onChange={(e) => onChange(e.target.value)} />;
  }
}

/** A colour: a picker plus the hex code, so an exact brand colour can be typed or pasted. */
function ColorField({ value, onChange }: { value: string; onChange: (v: unknown) => void }) {
  const full = /^#[0-9a-f]{6}$/i.test(value) ? value : /^#[0-9a-f]{3}$/i.test(value) ? '#' + [...value.slice(1)].map((c) => c + c).join('') : '#000000';
  return (
    <div className="color-field">
      <input type="color" aria-label="Pick a colour" value={full} onChange={(e) => onChange(e.target.value)} />
      <input type="text" aria-label="Colour code" placeholder="#7c3aed" maxLength={9} value={value} onChange={(e) => onChange(e.target.value.trim())} />
      {value && <button type="button" className="link" onClick={() => onChange('')}>Clear</button>}
    </div>
  );
}

/** A video from the media library (or a new upload), with a small preview. */
function VideoPicker({ site, value, onChange }: { site: Site; value: string; onChange: (v: unknown) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {value && <video src={value} className="thumb" muted loop autoPlay playsInline />}
      <div className="row">
        <button type="button" onClick={() => setOpen(true)}>{value ? 'Change video' : 'Choose video'}</button>
        {value && <button type="button" className="link" onClick={() => onChange('')}>Clear</button>}
      </div>
      {open && <MediaPicker site={site} kind="video" onClose={() => setOpen(false)} onPick={(url) => { onChange(url); setOpen(false); }} />}
    </div>
  );
}

function ImagePicker({ site, value, onChange }: { site: Site; value: string; onChange: (v: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Media[]>([]);
  useEffect(() => { if (open) api<Media[]>(`/sites/${site.id}/media`).then((m) => setItems(m.filter((x) => x.mimeType.startsWith('image/')))); }, [open]);
  return (
    <div>
      {value && <img src={value} className="thumb" alt="" />}
      <div className="row">
        <button type="button" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Choose from library'}</button>
        {value && <button type="button" className="link" onClick={() => onChange('')}>Clear</button>}
      </div>
      {open && <div className="grid">{items.map((m) => <img key={m.id} src={m.url} className="thumb pick" alt={m.originalName} onClick={() => { onChange(m.url); setOpen(false); }} />)}{!items.length && <p className="muted">No images uploaded yet.</p>}</div>}
    </div>
  );
}

/** A list of objects (each with the sub-fields in f.fields): add, remove, reorder, collapse. */
function ArrayField({ site, f, value, onChange, path }: { site: Site; f: Field; value: unknown; onChange: (v: unknown) => void; path?: string }) {
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const sub = f.fields ?? [];
  const set = (next: Record<string, unknown>[]) => onChange(next);
  // Reordering is by dragging an item's grip: `from` is the item being dragged, `over` the one it hovers.
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const endDrag = () => { setFrom(null); setOver(null); };
  const drop = (to: number) => {
    if (from !== null && from !== to) {
      const n = [...items];
      const [moved] = n.splice(from, 1);
      n.splice(to, 0, moved);
      set(n);
    }
    endDrag();
  };
  const label = (it: Record<string, unknown>, i: number) => {
    // the first short or long text of the item that has something in it
    const t = sub.find((x) => (x.type === 'text' || x.type === 'textarea') && String(it[x.name] ?? '').trim() !== '');
    const s = t ? String(it[t.name]).replace(/\s+/g, ' ').trim() : '';
    return s ? (s.length > 70 ? s.slice(0, 69) + '…' : s) : `Item ${i + 1}`;
  };
  return (
    <div className="array">
      {items.map((it, i) => (
        <ArrayItem
          key={i}
          startOpen={!it || Object.keys(it).length === 0}
          title={label(it, i)}
          dragging={from === i}
          dropAt={from !== null && over === i && from !== i ? (from < i ? 'after' : 'before') : undefined}
          onDragStart={() => setFrom(i)}
          onDragEnd={endDrag}
          onDragOver={() => from !== null && setOver(i)}
          onDrop={() => drop(i)}
          actions={
            <button type="button" className="link" onClick={async () => { if (await ask({ title: `Delete "${label(it, i)}"?`, message: 'It is removed when you save.', confirmLabel: 'Delete' })) set(items.filter((_, j) => j !== i)); }} aria-label="Remove">✕</button>
          }>
          <FieldForm site={site} fields={sub} data={it} path={path ? `${path}.${i}` : undefined} onChange={(d) => set(items.map((x, j) => (j === i ? d : x)))} />
        </ArrayItem>
      ))}
      <button type="button" onClick={() => set([...items, {}])}>+ Add {f.label || f.name}</button>
    </div>
  );
}

/** One item of a list field. It remembers whether it is open, so typing never collapses it. */
function ArrayItem({ startOpen, title, actions, children, dragging, dropAt, onDragStart, onDragEnd, onDragOver, onDrop }: {
  startOpen: boolean; title: string; actions: ReactNode; children: ReactNode;
  dragging: boolean; dropAt?: 'before' | 'after'; onDragStart: () => void; onDragEnd: () => void; onDragOver: () => void; onDrop: () => void;
}) {
  const [open, setOpen] = useState(startOpen);
  return (
    <details
      className={`array-item${dragging ? ' dragging' : ''}${dropAt ? ` drop-${dropAt}` : ''}`}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
    >
      <summary>
        <span
          className="drag-handle"
          draggable
          role="button"
          aria-label="Drag to reorder"
          title="Drag to reorder"
          onClick={(e) => e.preventDefault()}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', title);
            const item = e.currentTarget.closest('details');
            if (item) e.dataTransfer.setDragImage(item, 14, 14);
            onDragStart();
          }}
          onDragEnd={onDragEnd}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden>
            {[2, 8, 14].map((y) => [2, 8].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" />))}
          </svg>
        </span>
        <span className="array-title">{title}</span>
        <span className="array-actions" onClick={(e) => e.preventDefault()}>{actions}</span>
      </summary>
      <div className="array-body">{children}</div>
    </details>
  );
}
