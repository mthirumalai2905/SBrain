import { useState } from 'react';
import type { ContentType, Field, Section } from '../api';
import type { Change, Proposal } from '../pages/AgentPanel';
import { setAtPath } from './path';

/** The field an edit path points at (list item numbers are skipped). */
export function fieldAtPath(path: string, sections: Section[], docFields: Field[], sectionTypes: ContentType[]): Field | undefined {
  const [target, ...rest] = path.split('.');
  let fields: Field[] | undefined = target === 'page' ? docFields : sectionTypes.find((t) => t.slug === (sections.find((x) => x.id === target)?.type ?? ''))?.fields;
  let found: Field | undefined;
  for (const part of rest) {
    if (!isNaN(Number(part))) continue;
    found = fields?.find((x) => x.name === part);
    fields = found?.fields;
  }
  return found;
}

const short = (v: unknown) => {
  if (v === undefined || v === null || v === '') return '(empty)';
  const t = typeof v === 'string' ? v : JSON.stringify(v);
  return '“' + (t.length > 70 ? t.slice(0, 70) + '…' : t) + '”';
};
const plain = (v: unknown) => {
  if (v === undefined || v === null || v === '') return '';
  const t = typeof v === 'string' ? v : JSON.stringify(v);
  return t.length > 140 ? t.slice(0, 140) + '…' : t;
};
const getIn = (root: unknown, parts: string[]) => parts.reduce<unknown>((cur, k) => (cur == null ? undefined : (cur as Record<string, unknown>)[k]), root);

/**
 * Applies what the AI assistant proposed to a copy of the document and says, in words, what changed.
 * Nothing is saved or published: the editor puts the result in its unsaved state.
 */
export function applyProposalTo(
  state: { data: Record<string, unknown>; sections: Section[] },
  p: Proposal,
  docName: string,
  docFields: Field[],
  sectionTypes: ContentType[],
): { data: Record<string, unknown>; sections: Section[]; lines: string[]; changes: Change[] } {
  let data = state.data;
  let sections = state.sections;
  const lines: string[] = [];
  const changes: Change[] = [];
  const nameOf = (type?: string) => sectionTypes.find((t) => t.slug === type)?.name ?? 'Section';

  for (const e of p.edits) {
    const [target, ...rest] = e.path.split('.');
    const f = fieldAtPath(e.path, sections, docFields, sectionTypes);
    const sec = sections.find((s) => s.id === target);
    const item = rest.find((x) => /^\d+$/.test(x));
    const old = getIn(target === 'page' ? data : sec?.data, rest);
    lines.push(`${target === 'page' ? docName : nameOf(sec?.type)} › ${f?.label || f?.name || e.path}${item !== undefined ? ` (item ${Number(item) + 1})` : ''}: ${short(old)} → ${short(e.value)}`);
    changes.push({ kind: 'edit', where: `${target === 'page' ? docName : nameOf(sec?.type)}${item !== undefined ? ` · item ${Number(item) + 1}` : ''}`, field: f?.label || f?.name || e.path, from: plain(old), to: plain(e.value) });
    if (target === 'page') data = setAtPath(data, rest, e.value);
    else sections = sections.map((x) => (x.id === target ? { ...x, data: setAtPath(x.data, rest, e.value) } : x));
  }
  for (const k of p.removeKeys) {
    lines.push(`Removed section: ${nameOf(sections.find((x) => x.id === k)?.type)}`);
    changes.push({ kind: 'remove', where: nameOf(sections.find((x) => x.id === k)?.type) });
    sections = sections.filter((x) => x.id !== k);
  }
  for (const a of p.addSections) {
    const s: Section = { id: 's' + Math.random().toString(36).slice(2, 10), type: a.type, data: a.data };
    const found = a.afterKey ? sections.findIndex((x) => x.id === a.afterKey) + 1 : 0;
    const at = a.afterKey === 'start' ? 0 : a.afterKey && found ? found : sections.length;
    sections = [...sections.slice(0, at), s, ...sections.slice(at)];
    lines.push(`Added section: ${nameOf(a.type)}`);
    changes.push({ kind: 'add', where: nameOf(a.type) });
  }
  return { data, sections, lines, changes };
}

/** Whether the assistant drawer is open in Structure. Open the first time; after that it stays as you left it. */
export function useAiOpen(): [boolean, () => void] {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem('cms_ai_open') !== '0'; } catch { return true; } });
  const toggle = () => setOpen((o) => { try { localStorage.setItem('cms_ai_open', o ? '0' : '1'); } catch { /* ignore */ } return !o; });
  return [open, toggle];
}
