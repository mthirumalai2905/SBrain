import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireSite } from '../auth.js';
import { validateData, type Field } from '../fields.js';
import { actorOf, recordChange } from '../activity.js';

const sectionSchema = z.array(z.object({ id: z.string().min(1), type: z.string().min(1), data: z.record(z.unknown()) })).max(200);

/** Validates an entry's data against its type. Page types also carry data.sections, each checked against its section type. */
async function prepare(siteId: string, type: { kind: string; fields: unknown }, data: Record<string, unknown>) {
  const { sections, ...rest } = data;
  const v = validateData(type.fields as Field[], rest);
  const errors = [...v.errors];
  const out: Record<string, unknown> = { ...v.data };
  if (type.kind === 'page') {
    const parsed = sectionSchema.safeParse(sections ?? []);
    if (!parsed.success) {
      errors.push('sections: invalid');
    } else {
      const defs = await prisma.contentType.findMany({ where: { siteId, kind: 'section' } });
      const clean = [];
      for (const s of parsed.data) {
        const def = defs.find((d) => d.slug === s.type);
        if (!def) { errors.push('Unknown section type "' + s.type + '"'); continue; }
        const sv = validateData(def.fields as Field[], s.data);
        errors.push(...sv.errors.map((m) => def.name + ': ' + m));
        clean.push({ id: s.id, type: s.type, data: sv.data });
      }
      out.sections = clean;
    }
  }
  return { errors, data: out };
}

const body = z.object({
  contentTypeId: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/).nullish(),
  data: z.record(z.unknown()),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

export default async function (app: FastifyInstance) {
  app.get('/sites/:siteId/entries', { preHandler: requireSite('VIEWER') }, async (req) => {
    const { siteId } = req.params as { siteId: string };
    const { type } = req.query as { type?: string };
    return prisma.entry.findMany({ where: { siteId, ...(type ? { contentTypeId: type } : {}) }, orderBy: { updatedAt: 'desc' } });
  });

  app.get('/sites/:siteId/entries/:id', { preHandler: requireSite('VIEWER') }, async (req, reply) => {
    const { siteId, id } = req.params as { siteId: string; id: string };
    return (await prisma.entry.findFirst({ where: { id, siteId } })) ?? reply.code(404).send({ error: 'Not found' });
  });

  app.post('/sites/:siteId/entries', { preHandler: requireSite('EDITOR') }, async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    const b = body.parse(req.body);
    const type = await prisma.contentType.findFirst({ where: { id: b.contentTypeId, siteId } });
    if (!type) return reply.code(400).send({ error: 'Unknown content type' });
    if (type.kind === 'singleton' && (await prisma.entry.count({ where: { contentTypeId: type.id } })) > 0) {
      return reply.code(409).send({ error: type.name + ' is a single document and already exists' });
    }
    const v = await prepare(siteId, type, b.data);
    if (v.errors.length) return reply.code(422).send({ error: v.errors.join('; '), details: v.errors });
    const entry = await prisma.entry.create({
      data: {
        siteId, contentTypeId: type.id, slug: b.slug || null, data: v.data as object, status: b.status,
        publishedAt: b.status === 'PUBLISHED' ? new Date() : null,
      },
    });
    await recordChange({ entry, actor: await actorOf(req) });
    return reply.code(201).send(entry);
  });

  app.put('/sites/:siteId/entries/:id', { preHandler: requireSite('EDITOR') }, async (req, reply) => {
    const { siteId, id } = req.params as { siteId: string; id: string };
    const b = body.omit({ contentTypeId: true }).parse(req.body);
    const existing = await prisma.entry.findFirst({ where: { id, siteId }, include: { contentType: true } });
    if (!existing) return reply.code(404).send({ error: 'Not found' });
    const v = await prepare(siteId, existing.contentType, b.data);
    if (v.errors.length) return reply.code(422).send({ error: v.errors.join('; '), details: v.errors });
    const updated = await prisma.entry.update({
      where: { id },
      data: {
        slug: b.slug || null,
        data: v.data as object,
        status: b.status,
        publishedAt: b.status === 'PUBLISHED' ? existing.publishedAt ?? new Date() : null,
      },
    });
    await recordChange({ entry: updated, before: existing, actor: await actorOf(req) });
    return updated;
  });

  app.delete('/sites/:siteId/entries/:id', { preHandler: requireSite('EDITOR') }, async (req, reply) => {
    const { siteId, id } = req.params as { siteId: string; id: string };
    const gone = await prisma.entry.findFirst({ where: { id, siteId } });
    await prisma.entry.deleteMany({ where: { id, siteId } });
    if (gone) await recordChange({ entry: gone, action: 'deleted', actor: await actorOf(req) });
    return reply.code(204).send();
  });
}
