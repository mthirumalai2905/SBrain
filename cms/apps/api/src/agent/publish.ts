import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '../db.js';
import { validateData, type Field } from '../fields.js';
import { recordChange, type Actor } from '../activity.js';

/**
 * Publishing a draft that Claude (or another AI tool) worked on, through the MCP server.
 * The AI first calls preview_publish, which says what would change and returns a short-lived token for exactly that version
 * of the draft. Then it calls publish_page, which only runs with that token. publish_page is marked as a destructive tool,
 * so the AI app (Claude, Cursor...) shows its own Allow / Deny button before it runs: the confirmation happens there, not
 * in the CMS.
 */
export interface Line { where: string; field?: string; from?: string; to?: string; kind: 'edit' | 'add' | 'remove' }
type Doc = Record<string, unknown>;
type Sec = { id: string; type: string; data: Doc };

const plain = (v: unknown) => {
  if (v === undefined || v === null || v === '') return '';
  const t = typeof v === 'string' ? v : JSON.stringify(v);
  return t.length > 140 ? t.slice(0, 140) + '…' : t;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** What would change on the live page: fields that differ, and sections added or removed (sections are matched by key). */
export function diffDocs(oldData: Doc | null, newData: Doc, sectionName: (type: string) => string, docName: string): Line[] {
  const out: Line[] = [];
  const { sections: ns = [], ...nrest } = newData as Doc & { sections?: Sec[] };
  const { sections: os = [], ...orest } = (oldData ?? {}) as Doc & { sections?: Sec[] };
  const n = nrest as Doc;
  const o = orest as Doc;
  for (const k of new Set([...Object.keys(n), ...Object.keys(o)])) {
    if (!same(o[k], n[k])) out.push({ kind: 'edit', where: docName, field: k, from: plain(o[k]), to: plain(n[k]) });
  }
  for (const s of ns) {
    const before = os.find((x) => x.id === s.id);
    if (!before) { out.push({ kind: 'add', where: sectionName(s.type) }); continue; }
    for (const k of new Set([...Object.keys(s.data), ...Object.keys(before.data)])) {
      if (!same(before.data[k], s.data[k])) out.push({ kind: 'edit', where: sectionName(s.type), field: k, from: plain(before.data[k]), to: plain(s.data[k]) });
    }
  }
  for (const s of os) if (!ns.some((x) => x.id === s.id)) out.push({ kind: 'remove', where: sectionName(s.type) });
  return out.slice(0, 60);
}

const lookups = async (siteId: string) => {
  const types = await prisma.contentType.findMany({ where: { siteId } });
  return { types, sectionName: (slug: string) => types.find((t) => t.slug === slug)?.name ?? slug };
};

type EntryRow = NonNullable<Awaited<ReturnType<typeof prisma.entry.findFirst>>>;

/** Problems that would stop a draft being published (empty when it is fine), checked as if someone had published it by hand. */
export async function draftProblems(siteId: string, entry: EntryRow): Promise<string[]> {
  const { types } = await lookups(siteId);
  const type = types.find((t) => t.id === entry.contentTypeId);
  const { sections = [], ...rest } = entry.data as Doc & { sections?: Sec[] };
  const errors = validateData((type?.fields ?? []) as unknown as Field[], rest as Doc).errors;
  for (const s of sections) {
    const def = types.find((t) => t.kind === 'section' && t.slug === s.type);
    if (!def) errors.push(`Unknown section type "${s.type}"`);
    else errors.push(...validateData(def.fields as unknown as Field[], s.data).errors.map((m) => `${def.name}: ${m}`));
  }
  return errors;
}

/** What publishing this draft would do, in words: replaces a live page (with the field-by-field changes) or goes live as a new page. */
export async function previewDraft(siteId: string, entry: EntryRow, replaces: string) {
  const { types, sectionName } = await lookups(siteId);
  const docName = types.find((t) => t.id === entry.contentTypeId)?.name ?? 'Page';
  const target = replaces ? await prisma.entry.findFirst({ where: { siteId, contentTypeId: entry.contentTypeId, slug: replaces } }) : null;
  return { target, changes: diffDocs(target ? (target.data as Doc) : null, entry.data as Doc, sectionName, docName) };
}

/** Makes the draft live, either as itself or in place of a live page (the draft copy is then removed). */
export async function publishDraft(siteId: string, entry: EntryRow, replaces: string, actor?: Actor): Promise<{ ok: true; published: string } | { ok: false; status: number; error: string }> {
  const problems = await draftProblems(siteId, entry);
  if (problems.length) return { ok: false, status: 422, error: `It cannot be published yet: ${problems.join('; ')}` };
  const now = new Date();
  if (replaces) {
    const target = await prisma.entry.findFirst({ where: { siteId, contentTypeId: entry.contentTypeId, slug: replaces } });
    if (!target) return { ok: false, status: 409, error: `The live page "${replaces}" no longer exists, so there is nothing to replace.` };
    await prisma.$transaction([
      prisma.entry.update({ where: { id: target.id }, data: { data: entry.data as object, status: 'PUBLISHED', publishedAt: now } }),
      prisma.entry.delete({ where: { id: entry.id } }), // the draft copy has done its job
    ]);
    if (actor) { const now2 = await prisma.entry.findUnique({ where: { id: target.id } }); if (now2) await recordChange({ entry: now2, before: target, action: 'published', actor }); }
    return { ok: true, published: replaces };
  }
  await prisma.$transaction([prisma.entry.update({ where: { id: entry.id }, data: { status: 'PUBLISHED', publishedAt: now } })]);
  if (actor) { const now2 = await prisma.entry.findUnique({ where: { id: entry.id } }); if (now2) await recordChange({ entry: now2, before: entry, action: 'published', actor }); }
  return { ok: true, published: entry.slug ?? entry.id };
}

/**
 * A short-lived proof that THIS version of the draft was previewed. publish_page only runs with it, so the AI cannot publish
 * something it has not first described, and cannot publish a draft that changed after the preview.
 */
const secret = () => (process.env.JWT_SECRET ?? '') + ':publish-preview';
const sign = (entry: EntryRow, replaces: string, exp: number) => createHmac('sha256', secret()).update(`${entry.id}|${entry.updatedAt.toISOString()}|${replaces}|${exp}`).digest('base64url');
export const previewToken = (entry: EntryRow, replaces: string) => { const exp = Date.now() + 10 * 60_000; return `${exp}.${sign(entry, replaces, exp)}`; };
export function tokenValid(entry: EntryRow, replaces: string, token: string): boolean {
  const [expText, sig] = String(token).split('.');
  const exp = Number(expText);
  if (!exp || exp < Date.now() || !sig) return false;
  const want = Buffer.from(sign(entry, replaces, exp));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}
