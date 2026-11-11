import type { Entry } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import { prisma } from './db.js';
import { diffDocs } from './agent/publish.js';

/**
 * Activity: every time a document is created, changed, published or deleted we keep a copy of it (version history) and
 * a short note about it (the bell, and the email to the site's members). This never blocks or breaks a save.
 */
export interface Actor { id?: string | null; name: string; source: 'cms' | 'ai' }
export type Action = 'created' | 'edited' | 'published' | 'unpublished' | 'deleted' | 'restored';

const KEEP_VERSIONS = 60; // per document; older ones are dropped

/** Who is making this change, from the signed-in user of an admin request. */
export async function actorOf(req: FastifyRequest): Promise<Actor> {
  const u = await prisma.user.findUnique({ where: { id: req.user.sub }, select: { id: true, name: true } });
  return { id: u?.id ?? null, name: u?.name ?? 'Someone', source: 'cms' };
}

type Doc = Record<string, unknown>;
type Sec = { id: string; type: string; data: Doc };

const nice = (s: string) => s.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

/** "Hero: headline, subtitle · Added Pricing section" - what changed, in a few words. */
function describe(before: Doc | null, after: Doc, sectionName: (t: string) => string, docName: string): string {
  const lines = diffDocs(before, after, sectionName, docName);
  if (!lines.length) return '';
  const parts: string[] = [];
  const byWhere = new Map<string, string[]>();
  for (const l of lines) {
    if (l.kind === 'add') parts.push(`Added ${l.where}`);
    else if (l.kind === 'remove') parts.push(`Removed ${l.where}`);
    else byWhere.set(l.where, [...(byWhere.get(l.where) ?? []), nice(l.field ?? '')]);
  }
  const edits = [...byWhere].map(([where, fields]) => `${where}: ${fields.slice(0, 3).join(', ')}${fields.length > 3 ? ` +${fields.length - 3}` : ''}`);
  const all = [...edits, ...parts];
  return all.slice(0, 4).join(' · ') + (all.length > 4 ? ` · +${all.length - 4} more` : '');
}

export function actionFor(before: Pick<Entry, 'status'> | null, after: Pick<Entry, 'status'>): Action {
  if (!before) return 'created';
  if (before.status !== after.status) return after.status === 'PUBLISHED' ? 'published' : 'unpublished';
  return 'edited';
}

/**
 * Saves a version and a notification for a change. `before` is the document as it was (null when new);
 * `entry` is how it is now (for a delete, the document that was removed).
 */
export async function recordChange(opts: { entry: Entry; before?: Entry | null; action?: Action; actor: Actor }) {
  try {
    const { entry, before = null, actor } = opts;
    const action = opts.action ?? actionFor(before, entry);
    const types = await prisma.contentType.findMany({ where: { siteId: entry.siteId } });
    const type = types.find((t) => t.id === entry.contentTypeId);
    const sectionName = (slug: string) => types.find((t) => t.slug === slug)?.name ?? slug;
    const docName = type?.name ?? 'Document';
    const after = entry.data as Doc;
    const summary = action === 'edited' || action === 'restored' || action === 'published'
      ? describe(before ? (before.data as Doc) : null, after, sectionName, type?.kind === 'page' ? 'Page settings' : docName)
      : '';
    // Saving without changing anything is not worth a version or an email.
    if (action === 'edited' && !summary && before && before.slug === entry.slug) return;

    const textField = ((type?.fields as { name: string; type: string }[] | undefined) ?? []).find((f) => f.type === 'text');
    const label = String((textField && after[textField.name]) || '');
    // Name the page and its address, so a draft copy of "Home" is not mistaken for Home itself.
    const title = (label && entry.slug && label.toLowerCase() !== entry.slug ? `${label} (${entry.slug})` : label || entry.slug || docName).slice(0, 120);

    await prisma.entryVersion.create({
      data: {
        entryId: entry.id, siteId: entry.siteId, typeName: docName, title, slug: entry.slug, data: entry.data as object,
        status: entry.status, action, summary, actorId: actor.id ?? null, actorName: actor.name, source: actor.source,
      },
    });
    await prisma.notification.create({
      data: { siteId: entry.siteId, entryId: action === 'deleted' ? null : entry.id, action, title, summary, actorId: actor.id ?? null, actorName: actor.name, source: actor.source },
    });
    const old = await prisma.entryVersion.findMany({ where: { entryId: entry.id }, orderBy: { createdAt: 'desc' }, skip: KEEP_VERSIONS, select: { id: true } });
    if (old.length) await prisma.entryVersion.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  } catch (err) {
    console.error('activity: could not record a change', (err as Error).message);
  }
}
