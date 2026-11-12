import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireSite } from '../auth.js';
import { actorOf, recordChange } from '../activity.js';
import { mailConfigured, sendTest } from '../mailer.js';
import { diffDocs } from '../agent/publish.js';

/** The bell (recent changes, email setting) and version history of a document. */
export default async function (app: FastifyInstance) {
  app.get('/sites/:siteId/notifications', { preHandler: requireSite('VIEWER') }, async (req) => {
    const { siteId } = req.params as { siteId: string };
    const items = await prisma.notification.findMany({ where: { siteId }, orderBy: { createdAt: 'desc' }, take: 40 });
    const me = await prisma.membership.findUnique({ where: { userId_siteId: { userId: req.user.sub, siteId } } });
    return {
      items: items.map((n) => ({ id: n.id, entryId: n.entryId, action: n.action, title: n.title, summary: n.summary, actorId: n.actorId, actorName: n.actorName, source: n.source, createdAt: n.createdAt })),
      me: req.user.sub,
      email: { configured: mailConfigured(), on: me ? me.notifyEmail : null },
    };
  });

  app.put('/sites/:siteId/notify', { preHandler: requireSite('VIEWER') }, async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    const { email } = z.object({ email: z.boolean() }).parse(req.body);
    const done = await prisma.membership.updateMany({ where: { userId: req.user.sub, siteId }, data: { notifyEmail: email } });
    if (!done.count) return reply.code(404).send({ error: 'You are not a member of this site, so there is no email setting to change.' });
    return { email };
  });

  app.post('/sites/:siteId/notify/test', { preHandler: requireSite('ADMIN') }, async (req, reply) => {
    const { to } = z.object({ to: z.string().email() }).parse(req.body);
    try { await sendTest(to); } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
    return { ok: true };
  });

  /**
   * The saved versions of a document, newest first. Each one says who made it (their current name), when, and what changed
   * compared with the version before it, field by field.
   */
  app.get('/sites/:siteId/entries/:id/versions', { preHandler: requireSite('VIEWER') }, async (req) => {
    const { siteId, id } = req.params as { siteId: string; id: string };
    const rows = await prisma.entryVersion.findMany({ where: { siteId, entryId: id }, orderBy: { createdAt: 'desc' }, take: 60 });
    const [types, users] = await Promise.all([
      prisma.contentType.findMany({ where: { siteId } }),
      prisma.user.findMany({ where: { id: { in: rows.map((r) => r.actorId).filter((x): x is string => !!x) } }, select: { id: true, name: true } }),
    ]);
    const sectionName = (slug: string) => types.find((t) => t.slug === slug)?.name ?? slug;
    const label = (st: string) => (st === 'PUBLISHED' ? 'Published' : 'Draft');
    return rows.map((v, i) => {
      const prev = rows[i + 1];
      const kind = types.find((t) => t.name === v.typeName)?.kind;
      const changes: { kind: string; where: string; field?: string; from?: string; to?: string }[] = [];
      if (prev) {
        if (prev.status !== v.status) changes.push({ kind: 'edit', where: 'Status', from: label(prev.status), to: label(v.status) });
        if ((prev.slug ?? '') !== (v.slug ?? '')) changes.push({ kind: 'edit', where: 'Address', from: prev.slug ?? '', to: v.slug ?? '' });
        changes.push(...diffDocs(prev.data as Record<string, unknown>, v.data as Record<string, unknown>, sectionName, kind === 'page' ? 'Page settings' : v.typeName));
      } else if (v.action === 'created') {
        const n = Array.isArray((v.data as { sections?: unknown[] }).sections) ? (v.data as { sections: unknown[] }).sections.length : 0;
        if (n) changes.push({ kind: 'add', where: `${n} section${n === 1 ? '' : 's'}` });
      }
      return {
        id: v.id, action: v.action, summary: v.summary, status: v.status, source: v.source, title: v.title, createdAt: v.createdAt,
        // their name as it is now, so a person renamed since (or the built-in user) shows the right name on old versions too
        actorName: users.find((u) => u.id === v.actorId)?.name ?? v.actorName,
        changes: changes.slice(0, 40), changeCount: changes.length,
      };
    });
  });

  /** Puts an older version's content back. The document keeps its current status (a draft stays a draft). The restore itself becomes a new version. */
  app.post('/sites/:siteId/entries/:id/versions/:versionId/restore', { preHandler: requireSite('EDITOR') }, async (req, reply) => {
    const { siteId, id, versionId } = req.params as { siteId: string; id: string; versionId: string };
    const v = await prisma.entryVersion.findFirst({ where: { id: versionId, siteId, entryId: id } });
    const before = await prisma.entry.findFirst({ where: { id, siteId } });
    if (!v || !before) return reply.code(404).send({ error: 'That version or document no longer exists.' });
    const entry = await prisma.entry.update({ where: { id }, data: { data: v.data as object } });
    await recordChange({ entry, before, action: 'restored', actor: await actorOf(req) });
    return entry;
  });
}
