import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fstatic from '@fastify/static';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ZodError } from 'zod';
import auth from './routes/auth.js';
import sites from './routes/sites.js';
import types from './routes/types.js';
import entries from './routes/entries.js';
import media, { uploadDir } from './routes/media.js';
import pub from './routes/public.js';
import agent from './routes/agent.js';
import connectors from './routes/connectors.js';
import aikeys from './routes/aikeys.js';

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 16) throw new Error('Set JWT_SECRET (16+ chars) in apps/api/.env');

if (process.env.AUTH_DISABLED === 'true' && !['localhost', '127.0.0.1', '::1'].includes(process.env.HOST ?? 'localhost')) {
  throw new Error('AUTH_DISABLED=true is only allowed when HOST is localhost, 127.0.0.1 or ::1');
}

const app = Fastify({ logger: true });

app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
  if (err instanceof ZodError) {
    return reply.code(400).send({ error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
  }
  const code = (err as { code?: string }).code;
  if (code === 'P2021' || code === 'P2022') {
    app.log.error(err);
    return reply.code(503).send({ error: 'Database is not set up. Run: npm run db:migrate' });
  }
  if (code === 'P1000' || code === 'P1001' || code === 'P1002' || err.name === 'PrismaClientInitializationError') {
    app.log.error(err);
    return reply.code(503).send({ error: 'Cannot connect to the database. Check DATABASE_URL in apps/api/.env and that Postgres is running.' });
  }
  const status = err.statusCode ?? 500;
  if (status >= 500) app.log.error(err);
  reply.code(status).send({ error: status >= 500 ? 'Internal error' : err.message });
});

const adminOrigins = (process.env.ADMIN_ORIGIN ?? 'http://localhost:5173').split(',');
await app.register(cors, {
  // Read-only delivery API is open to any site; everything else is limited to the admin.
  delegator: (req, cb) =>
    cb(null, req.url.startsWith('/public/')
      ? { origin: '*', methods: ['GET'], allowedHeaders: ['x-api-key'] }
      : { origin: adminOrigins, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }),
});
await app.register(jwt, { secret });
await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1 } });

await mkdir(uploadDir(), { recursive: true });
await app.register(fstatic, {
  root: resolve(uploadDir()),
  prefix: '/uploads/',
  setHeaders: (res) => res.setHeader('cross-origin-resource-policy', 'cross-origin'),
});

app.get('/health', async () => ({ ok: true }));

// Script for sites to include so editors can click-to-edit in the live preview (see sdk/visual-editing.js).
app.get('/sdk/visual-editing.js', async (_req, reply) => {
  const file = await readFile(new URL('../sdk/visual-editing.js', import.meta.url), 'utf8');
  return reply.header('content-type', 'text/javascript; charset=utf-8').header('cache-control', 'no-cache').header('cross-origin-resource-policy', 'cross-origin').send(file);
});
await app.register(auth);
await app.register(sites);
await app.register(types);
await app.register(entries);
await app.register(media);
await app.register(pub);
await app.register(agent);
await app.register(connectors);
await app.register(aikeys);

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? 'localhost';
await app.listen({ port, host });
