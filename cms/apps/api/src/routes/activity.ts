import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireSite } from '../auth.js';
import { actorOf, recordChange } from '../activity.js';
import { mailConfigured, sendTest } from '../mailer.js';

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

  app.get('/sites/:siteId/entries/:id/versions', { preHandler: requireSite('VIEWER') }, async (req) => {
    const { siteId, id } = req.params as { siteId: string; id: string };
    const rows = await prisma.entryVersion.findMany({ where: { siteId, entryId: id }, orderBy: { createdAt: 'desc' }, take: 60 });
    return rows.map((v) => ({ id: v.id, action: v.action, summary: v.summary, status: v.status, actorName: v.actorName, source: v.source, createdAt: v.createdAt, title: v.title }));
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
