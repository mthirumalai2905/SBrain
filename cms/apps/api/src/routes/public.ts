import type { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../db.js';

/** Resolves the site from an API key (x-api-key header or ?key=), else from the request's domain. */
async function resolveSite(req: FastifyRequest) {
  const key = (req.headers['x-api-key'] as string | undefined) ?? (req.query as { key?: string }).key;
  if (key) return prisma.site.findUnique({ where: { apiKey: key } });
  let origin: string | undefined;
  try {
    origin = req.headers.origin ? new URL(req.headers.origin).host : undefined;
  } catch {
    /* ignore malformed origin */
  }
  const host = (req.headers['x-site-domain'] as string | undefined) ?? origin ?? req.headers.host;
  if (!host) return null;
  return prisma.site.findFirst({ where: { domains: { has: host.toLowerCase().replace(/^www\./, '') } } });
}

// Page sections are returned flat and ordered: { _key, _type, ...fields }.
const shape = (e: { id: string; slug: string | null; data: unknown; publishedAt: Date | null; updatedAt: Date }) => {
  const d = { ...(e.data as Record<string, unknown>) };
  if (Array.isArray(d.sections)) {
    d.sections = (d.sections as { id: string; type: string; data: object }[]).map((s) => ({ _key: s.id, _type: s.type, ...s.data }));
  }
  return { id: e.id, slug: e.slug, publishedAt: e.publishedAt, updatedAt: e.updatedAt, ...d };
};

export default async function (app: FastifyInstance) {
  // Read-only delivery, open to any origin; the site is identified by key or domain.
  app.register(async (pub) => {
    pub.addHook('onSend', async (_req, reply) => {
      reply.header('cache-control', 'public, max-age=30, stale-while-revalidate=300');
    });

    pub.get('/public/:type', async (req, reply) => {
      const site = await resolveSite(req);
      if (!site) return reply.code(404).send({ error: 'Unknown site' });
      const { type } = req.params as { type: string };
      const { limit = '50', offset = '0' } = req.query as { limit?: string; offset?: string };
      const ct = await prisma.contentType.findUnique({ where: { siteId_slug: { siteId: site.id, slug: type } } });
      if (!ct) return reply.code(404).send({ error: 'Unknown content type' });
      const where = { contentTypeId: ct.id, status: 'PUBLISHED' as const };
      const all = await prisma.entry.findMany({ where, orderBy: { publishedAt: 'desc' } });
      // Types with a numeric "order" field are returned in that order; others newest first.
      if ((ct.fields as { name: string }[]).some((f) => f.name === 'order')) {
        const n = (e: { data: unknown }) => Number((e.data as { order?: number }).order ?? 1e9);
        all.sort((a, b) => n(a) - n(b));
      }
      const start = +offset || 0;
      return { total: all.length, items: all.slice(start, start + Math.min(+limit || 50, 100)).map(shape) };
    });

    pub.get('/public/:type/:idOrSlug', async (req, reply) => {
      const site = await resolveSite(req);
      if (!site) return reply.code(404).send({ error: 'Unknown site' });
      const { type, idOrSlug } = req.params as { type: string; idOrSlug: string };
      const ct = await prisma.contentType.findUnique({ where: { siteId_slug: { siteId: site.id, slug: type } } });
      if (!ct) return reply.code(404).send({ error: 'Unknown content type' });
      const e = await prisma.entry.findFirst({
        where: { contentTypeId: ct.id, status: 'PUBLISHED', OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      });
      return e ? shape(e) : reply.code(404).send({ error: 'Not found' });
    });
  });
}
