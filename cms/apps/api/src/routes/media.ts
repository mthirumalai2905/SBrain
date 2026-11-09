import type { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { prisma } from '../db.js';
import { requireSite } from '../auth.js';

export const uploadDir = () => process.env.UPLOAD_DIR ?? './uploads';
const allowed = /^(image\/(png|jpe?g|gif|webp|avif)|application\/pdf|video\/(mp4|webm))$/;

const withUrl = (m: { siteId: string; filename: string }) => ({
  url: `${process.env.PUBLIC_URL ?? ''}/uploads/${m.siteId}/${m.filename}`,
});

export default async function (app: FastifyInstance) {
  app.get('/sites/:siteId/media', { preHandler: requireSite('VIEWER') }, async (req) => {
    const { siteId } = req.params as { siteId: string };
    const items = await prisma.media.findMany({ where: { siteId }, orderBy: { createdAt: 'desc' } });
    return items.map((m) => ({ ...m, ...withUrl(m) }));
  });

  app.post('/sites/:siteId/media', { preHandler: requireSite('EDITOR') }, async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: 'No file' });
    // SVG is excluded on purpose: uploaded SVG can carry scripts.
    if (!allowed.test(file.mimetype)) return reply.code(415).send({ error: `Unsupported type ${file.mimetype}` });
    const dir = join(uploadDir(), siteId);
    await mkdir(dir, { recursive: true });
    const filename = randomBytes(12).toString('hex') + extname(file.filename).toLowerCase().replace(/[^.a-z0-9]/g, '');
    const path = join(dir, filename);
    await pipeline(file.file, createWriteStream(path));
    if (file.file.truncated) {
      await unlink(path);
      return reply.code(413).send({ error: 'File too large (25 MB max)' });
    }
    const { size } = await stat(path);
    const m = await prisma.media.create({ data: { siteId, filename, originalName: file.filename, mimeType: file.mimetype, size } });
    return reply.code(201).send({ ...m, ...withUrl(m) });
  });

  app.delete('/sites/:siteId/media/:id', { preHandler: requireSite('EDITOR') }, async (req, reply) => {
    const { siteId, id } = req.params as { siteId: string; id: string };
    const m = await prisma.media.findFirst({ where: { id, siteId } });
    if (m) {
      await prisma.media.delete({ where: { id } });
      await unlink(join(uploadDir(), siteId, m.filename)).catch(() => {});
    }
    return reply.code(204).send();
  });
}
