import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireSite } from '../auth.js';
import { fieldSchema } from '../fields.js';

const body = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  fields: z.array(fieldSchema),
  // collection = list of documents; singleton = exactly one document (Header, Footer, Settings);
  // page = a document with an ordered list of sections (page builder); section = a reusable block a page can contain.
  kind: z.enum(['collection', 'singleton', 'page', 'section']).default('collection'),
});

export default async function (app: FastifyInstance) {
  app.get('/sites/:siteId/types', { preHandler: requireSite('VIEWER') }, async (req) => {
    const { siteId } = req.params as { siteId: string };
    return prisma.contentType.findMany({ where: { siteId }, orderBy: { createdAt: 'asc' } });
  });

  app.post('/sites/:siteId/types', { preHandler: requireSite('ADMIN') }, async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    return reply.code(201).send(await prisma.contentType.create({ data: { ...body.parse(req.body), siteId } }));
  });

  app.put('/sites/:siteId/types/:id', { preHandler: requireSite('ADMIN') }, async (req, reply) => {
    const { siteId, id } = req.params as { siteId: string; id: string };
    const r = await prisma.contentType.updateMany({ where: { id, siteId }, data: body.parse(req.body) });
    if (!r.count) return reply.code(404).send({ error: 'Not found' });
    return prisma.contentType.findUnique({ where: { id } });
  });

  app.delete('/sites/:siteId/types/:id', { preHandler: requireSite('ADMIN') }, async (req, reply) => {
    const { siteId, id } = req.params as { siteId: string; id: string };
    await prisma.contentType.deleteMany({ where: { id, siteId } });
    return reply.code(204).send();
  });
}
