import { useEffect, useState } from 'react';
import { ask } from '../lib/confirm';
import { api, type ContentType, type Field, type FieldType, type Site } from '../api';

const FIELD_TYPES: FieldType[] = ['text', 'textarea', 'richtext', 'number', 'boolean', 'date', 'image', 'video', 'color', 'icon', 'select', 'json', 'array'];
const LEAF_TYPES = FIELD_TYPES.filter((x) => x !== 'array');
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const blank = (): Partial<ContentType> => ({ name: '', slug: '', kind: 'collection', fields: [{ name: 'title', label: 'Title', type: 'text', required: true }] });

export function Types({ site, canAdmin }: { site: Site; canAdmin: boolean }) {
  const [types, setTypes] = useState<ContentType[]>([]);
  const [edit, setEdit] = useState<Partial<ContentType> | null>(null);
  const [err, setErr] = useState('');
  const base = `/sites/${site.id}/types`;
  const load = () => api<ContentType[]>(base).then(setTypes);
  useEffect(() => { load(); }, [site.id]);

  async function save() {
    setErr('');
    try {
      const body = { name: edit!.name, slug: edit!.slug, fields: edit!.fields, kind: edit!.kind ?? 'collection' };
      if (edit!.id) await api(`${base}/${edit!.id}`, { method: 'PUT', body });
      else await api(base, { body });
      setEdit(null);
      load();
    } catch (x) { setErr((x as Error).message); }
  }

  const setField = (i: number, p: Partial<Field>) =>
    setEdit({ ...edit, fields: edit!.fields!.map((f, j) => (j === i ? { ...f, ...p } : f)) });

  if (edit) {
    return (
      <div>
        <h2>{edit.id ? 'Edit content type' : 'New content type'}</h2>
        <div className="row">
          <input placeholder="Name (e.g. Blog posts)" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value, slug: edit.id ? edit.slug : slugify(e.target.value) })} />
          <input placeholder="api-slug" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} />
        </div>
        <div className="fld">
          <label className="lbl">Kind</label>
          <select value={edit.kind ?? 'collection'} onChange={(e) => setEdit({ ...edit, kind: e.target.value as NonNullable<ContentType['kind']> })}>
            <option value="collection">List of documents (e.g. Articles)</option>
            <option value="singleton">Single document (e.g. Home, Header, Footer, Website Settings)</option>
            <option value="page">Page (built from sections)</option>
            <option value="section">Section block (used inside pages)</option>
          </select>
        </div>
        <h3>Fields</h3>
        {edit.fields!.map((f, i) => (
          <div className="row field" key={i}>
            <input placeholder="name" value={f.name} onChange={(e) => setField(i, { name: e.target.value })} />
            <input placeholder="Label" value={f.label ?? ''} onChange={(e) => setField(i, { label: e.target.value })} />
            <select value={f.type} onChange={(e) => setField(i, { type: e.target.value as FieldType })}>
              {FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            {f.type === 'select' && <input placeholder="options, comma separated" value={f.options?.join(',') ?? ''} onChange={(e) => setField(i, { options: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />}
            <label className="chk"><input type="checkbox" checked={!!f.required} onChange={(e) => setField(i, { required: e.target.checked })} /> required</label>
            <button className="link" onClick={() => setEdit({ ...edit, fields: edit.fields!.filter((_, j) => j !== i) })}>Remove</button>
            {f.type === 'array' && (
              <div className="subfields">
                <span className="lbl">Each item has these fields</span>
                {(f.fields ?? []).map((sf, k) => (
                  <div className="row field" key={k}>
                    <input placeholder="name" value={sf.name} onChange={(e) => setField(i, { fields: (f.fields ?? []).map((x, m) => (m === k ? { ...x, name: e.target.value } : x)) })} />
                    <input placeholder="Label" value={sf.label ?? ''} onChange={(e) => setField(i, { fields: (f.fields ?? []).map((x, m) => (m === k ? { ...x, label: e.target.value } : x)) })} />
                    <select value={sf.type} onChange={(e) => setField(i, { fields: (f.fields ?? []).map((x, m) => (m === k ? { ...x, type: e.target.value as FieldType } : x)) })}>
                      {LEAF_TYPES.map((x) => <option key={x}>{x}</option>)}
                    </select>
                    <button className="link" onClick={() => setField(i, { fields: (f.fields ?? []).filter((_, m) => m !== k) })}>Remove</button>
                  </div>
                ))}
                <button onClick={() => setField(i, { fields: [...(f.fields ?? []), { name: '', type: 'text' }] })}>+ Add item field</button>
              </div>
            )}
          </div>
        ))}
        <button onClick={() => setEdit({ ...edit, fields: [...edit.fields!, { name: '', type: 'text' }] })}>+ Add field</button>
        {err && <p className="err">{err}</p>}
        <div className="row">
          <button className="primary" onClick={save}>Save</button>
          <button onClick={() => setEdit(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="head"><h2>Content types</h2>{canAdmin && <button className="primary" onClick={() => setEdit(blank())}>New type</button>}</div>
      {!types.length && <p className="muted">No content types yet.</p>}
      <ul className="list">
        {types.map((t) => (
          <li key={t.id}>
            <div><strong>{t.name}</strong> <code>/public/{t.slug}</code><div className="muted">{({ singleton: 'Single document', page: 'Page', section: 'Section block' } as Record<string, string>)[t.kind ?? ''] ?? 'List'} · {t.fields.length} fields</div></div>
            {canAdmin && (
              <div>
                <button onClick={() => setEdit(t)}>Edit</button>
                <button className="link delete-link" onClick={async () => { if (await ask({ title: `Delete "${t.name}"?`, message: 'The content type and all its entries are removed permanently and cannot be undone.', confirmLabel: 'Delete' })) { await api(`${base}/${t.id}`, { method: 'DELETE' }); load(); } }}>Delete</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
