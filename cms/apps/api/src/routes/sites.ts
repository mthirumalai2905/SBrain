import type { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authenticate, requireSite, requireSuperAdmin } from '../auth.js';

const siteBody = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  domains: z.array(z.string().min(1)).default([]),
});
// Optional URL of the site's front end, shown in the admin's live preview. http(s) only.
const previewUrl = z
  .string()
  .trim()
  .refine((u) => u === '' || /^https?:\/\/[^\s]+$/i.test(u), 'Preview URL must start with http:// or https://')
  .transform((u) => u || null)
  .nullish();
const newKey = () => 'cms_' + randomBytes(24).toString('hex');
const lower = (d?: string[]) => d?.map((x) => x.trim().toLowerCase().replace(/^www\./, ''));

export default async function (app: FastifyInstance) {
  app.get('/sites', { preHandler: authenticate }, async (req) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    if (user.isSuperAdmin) {
      const all = await prisma.site.findMany({ orderBy: { createdAt: 'asc' } });
      return all.map((s) => ({ ...s, role: 'ADMIN' }));
    }
    const ms = await prisma.membership.findMany({ where: { userId: user.id }, include: { site: true } });
    // API keys are only shown to site admins.
    return ms.map((m) => ({ ...m.site, apiKey: m.role === 'ADMIN' ? m.site.apiKey : undefined, role: m.role }));
  });

  app.post('/sites', { preHandler: requireSuperAdmin }, async (req, reply) => {
    const body = siteBody.parse(req.body);
    const site = await prisma.site.create({ data: { ...body, domains: lower(body.domains)!, apiKey: newKey() } });
    return reply.code(201).send(site);
  });

  app.patch('/sites/:siteId', { preHandler: requireSite('ADMIN') }, async (req) => {
    const { siteId } = req.params as { siteId: string };
    const body = siteBody.partial().extend({ previewUrl }).parse(req.body);
    return prisma.site.update({ where: { id: siteId }, data: { ...body, domains: lower(body.domains) } });
  });

  app.post('/sites/:siteId/rotate-key', { preHandler: requireSite('ADMIN') }, async (req) => {
    const { siteId } = req.params as { siteId: string };
    return prisma.site.update({ where: { id: siteId }, data: { apiKey: newKey() } });
  });

  app.delete('/sites/:siteId', { preHandler: requireSuperAdmin }, async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    await prisma.site.delete({ where: { id: siteId } });
    return reply.code(204).send();
  });

  app.get('/sites/:siteId/members', { preHandler: requireSite('ADMIN') }, async (req) => {
    const { siteId } = req.params as { siteId: string };
    const ms = await prisma.membership.findMany({ where: { siteId }, include: { user: true } });
    return ms.map((m) => ({ userId: m.userId, email: m.user.email, name: m.user.name, role: m.role }));
  });

  app.put('/sites/:siteId/members', { preHandler: requireSite('ADMIN') }, async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    const body = z.object({ email: z.string().email(), role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user) return reply.code(404).send({ error: 'No user with that email. A super admin must create the account first.' });
    await prisma.membership.upsert({
      where: { userId_siteId: { userId: user.id, siteId } },
      update: { role: body.role },
      create: { userId: user.id, siteId, role: body.role },
    });
    return { ok: true };
  });

  app.delete('/sites/:siteId/members/:userId', { preHandler: requireSite('ADMIN') }, async (req, reply) => {
    const { siteId, userId } = req.params as { siteId: string; userId: string };
    await prisma.membership.deleteMany({ where: { siteId, userId } });
    return reply.code(204).send();
  });
}
