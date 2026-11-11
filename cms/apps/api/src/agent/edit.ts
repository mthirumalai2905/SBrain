import { validateData, type Field } from '../fields.js';

/** One section of a page, as stored: its own key, its type and its fields. */
export interface SectionRow { id: string; type: string; data: Record<string, unknown> }
export interface SectionDef { slug: string; name: string; fields: Field[] }
export interface DocState { data: Record<string, unknown>; sections: SectionRow[] }
export interface ChangeArgs {
  edits?: { path?: string; value?: unknown; value_json?: string }[];
  add_sections?: { type?: string; data?: unknown; data_json?: string; after_key?: string }[];
  remove_section_keys?: string[];
}

/** Icons an icon field accepts as "icon:<name>" (keep in step with apps/admin/src/lib/iconset.ts). */
export const ICONS = 'lock check globe link mail star heart bolt shield play tag people user home search sliders chat cloud code rocket chart cube arrow plus clock database sparkle synx-pass synx-dns synx-bios skalle'.split(' ');

export const describeFields = (fields: Field[], indent = '  '): string =>
  fields.map((f) => {
    const extra = f.options?.length ? ` one of: ${f.options.join(' | ')}` : '';
    const line = `${indent}- ${f.name} (${f.type}${f.required ? ', required' : ''})${f.label ? ` "${f.label}"` : ''}${extra}`;
    return f.type === 'array' && f.fields?.length ? `${line}, each item has:\n${describeFields(f.fields as Field[], indent + '    ')}` : line;
  }).join('\n');

/** Sets one value at a path like ["items", "2", "title"], returning a copy. */
export function setAtPath<T>(root: T, parts: string[], value: unknown): T {
  if (!parts.length) return value as T;
  const [head, ...rest] = parts;
  if (Array.isArray(root) || (root === undefined && /^\d+$/.test(head))) {
    const arr = [...((root as unknown[]) ?? [])];
    arr[Number(head)] = setAtPath(arr[Number(head)], rest, value);
    return arr as T;
  }
  const obj = { ...((root as Record<string, unknown>) ?? {}) };
  obj[head] = setAtPath(obj[head], rest, value);
  return obj as T;
}

function itemsExist(root: unknown, rest: string[]): boolean {
  let cur: unknown = root;
  for (const part of rest) {
    if (/^\d+$/.test(part)) {
      if (!Array.isArray(cur) || Number(part) >= cur.length) return false;
      cur = cur[Number(part)];
    } else {
      cur = (cur as Record<string, unknown> | undefined)?.[part];
    }
  }
  return true;
}

const parse = (v: unknown, json: unknown): { ok: true; value: unknown } | { ok: false } => {
  if (v !== undefined) return { ok: true, value: v };
  if (typeof json !== 'string') return { ok: false };
  try { return { ok: true, value: JSON.parse(json) }; } catch { return { ok: false }; }
};

/**
 * Applies edits, new sections and removals to a copy of a document, checking every one against the content types.
 * Anything invalid is skipped and reported in `problems` so the caller can fix and resend just those.
 * Edit paths are "page.<field>" for the document itself, or "<sectionKey>.<field>[.<index>.<subfield>]".
 */
export function applyChanges(docFields: Field[], sectionDefs: SectionDef[], isPage: boolean, state: DocState, args: ChangeArgs, newId: () => string) {
  let data = state.data;
  let sections = state.sections;
  const problems: string[] = [];
  let applied = 0;
  const keys = () => sections.map((s) => s.id);
  const fieldsOf = (target: string): Field[] | undefined => {
    if (target === 'page') return docFields;
    const s = sections.find((x) => x.id === target);
    return s ? sectionDefs.find((d) => d.slug === s.type)?.fields : undefined;
  };

  for (const e of args.edits ?? []) {
    const path = String(e.path ?? '');
    const [target, ...rest] = path.split('.');
    const fields = fieldsOf(target);
    if (!fields) { problems.push(`${path}: unknown target "${target}". Use "page" or a section key: ${keys().join(', ') || '(none)'}`); continue; }
    if (!rest.length || /^\d+$/.test(rest[rest.length - 1])) { problems.push(`${path}: the path must end with a field name`); continue; }
    let list = fields;
    let leaf: Field | undefined;
    for (const part of rest) {
      if (/^\d+$/.test(part)) continue;
      leaf = list.find((f) => f.name === part);
      if (!leaf) break;
      list = (leaf.fields ?? []) as Field[];
    }
    if (!leaf || leaf.name !== rest[rest.length - 1]) { problems.push(`${path}: no such field`); continue; }
    const root = target === 'page' ? data : sections.find((x) => x.id === target)?.data;
    if (!itemsExist(root, rest.slice(0, -1))) { problems.push(`${path}: that list item does not exist. Replace the whole list instead.`); continue; }
    const v = parse(e.value, e.value_json);
    if (!v.ok) { problems.push(`${path}: give a value`); continue; }
    const check = validateData([leaf], { [leaf.name]: v.value }).errors;
    if (check.length) { problems.push(`${path}: ${check.join('; ')}`); continue; }
    if ((leaf.type === 'image' || leaf.type === 'video') && typeof v.value === 'string' && v.value && !/^(https?:\/\/|\/uploads\/)/.test(v.value)) {
      problems.push(`${path}: use the address of a file already in the media library, or leave it empty`); continue;
    }
    if (leaf.type === 'icon' && typeof v.value === 'string' && v.value.startsWith('icon:') && !ICONS.includes(v.value.slice(5))) {
      problems.push(`${path}: unknown icon. Use one of: ${ICONS.join(', ')}`); continue;
    }
    if (target === 'page') data = setAtPath(data, rest, v.value);
    else sections = sections.map((x) => (x.id === target ? { ...x, data: setAtPath(x.data, rest, v.value) } : x));
    applied++;
  }

  for (const k of args.remove_section_keys ?? []) {
    if (!keys().includes(k)) { problems.push(`remove_section_keys: "${k}" is not a section key`); continue; }
    sections = sections.filter((x) => x.id !== k);
    applied++;
  }

  for (const a of args.add_sections ?? []) {
    if (!isPage) { problems.push('This document has no sections.'); break; }
    const def = sectionDefs.find((d) => d.slug === a.type);
    if (!def) { problems.push(`add_sections: unknown type "${a.type}". Types: ${sectionDefs.map((d) => d.slug).join(', ')}`); continue; }
    const v = parse(a.data, a.data_json);
    if (!v.ok || !v.value || typeof v.value !== 'object' || Array.isArray(v.value)) { problems.push(`add_sections ${a.type}: data must be an object of fields`); continue; }
    const r = validateData(def.fields, v.value as Record<string, unknown>);
    if (r.errors.length) { problems.push(`add_sections ${a.type}: ${r.errors.join('; ')}`); continue; }
    const after = a.after_key ?? '';
    if (after && after !== 'start' && !keys().includes(after)) { problems.push(`add_sections ${a.type}: after_key "${after}" is not a section key`); continue; }
    const at = after === 'start' ? 0 : after ? sections.findIndex((x) => x.id === after) + 1 : sections.length;
    sections = [...sections.slice(0, at), { id: newId(), type: def.slug, data: r.data }, ...sections.slice(at)];
    applied++;
  }
  return { data, sections, applied, problems };
}
