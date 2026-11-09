import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireSite } from '../auth.js';
import { encrypt, decrypt } from '../agent/secret.js';
import { forgetServer, listTools } from '../agent/mcp.js';
import { callApi } from '../agent/apis.js';
import { configuredApis } from '../agent/apis.js';
import { configuredServers } from '../agent/mcp.js';

/** https anywhere; plain http only for a server on this computer. */
const address = z.string().trim().refine((u) => {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' || (x.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(x.hostname));
  } catch { return false; }
}, 'Use an https address (http is only allowed for localhost).');

const base = {
  kind: z.enum(['mcp', 'api']),
  name: z.string().trim().regex(/^[\w-]{1,24}$/, 'Name: letters, digits, - or _ (up to 24)'),
  url: address,
  description: z.string().trim().max(200).default(''),
  tokenHeader: z.string().trim().regex(/^[\w-]{0,40}$/, 'Header name: letters, digits, - or _').default(''),
  allowWrites: z.boolean().default(false),
};
const createBody = z.object({ ...base, token: z.string().max(4000).optional() });
const updateBody = z.object({ ...base, token: z.string().max(4000).optional(), clearToken: z.boolean().optional() }).partial();

/** What the browser may see: everything except the token itself. */
const view = (c: { id: string; kind: string; name: string; url: string; description: string; tokenHeader: string; tokenEnc: string | null; allowWrites: boolean }) => ({
  id: c.id, kind: c.kind, name: c.name, url: c.url, description: c.description, tokenHeader: c.tokenHeader, allowWrites: c.allowWrites, hasToken: !!c.tokenEnc,
});

export default async function (app: FastifyInstance) {
  app.get('/sites/:siteId/connectors', { preHandler: requireSite('ADMIN') }, async (req) => {
    const { siteId } = req.params as { siteId: string };
    const rows = await prisma.connector.findMany({ where: { siteId, kind: { in: ['mcp', 'api'] } }, orderBy: { createdAt: 'asc' } });
    return {
      items: rows.map(view),
      // set for the whole install in apps/api/.env: shown so they are not a surprise, but only changed there
      fromEnv: [...configuredServers().map((s) => ({ kind: 'mcp', name: s.name })), ...configuredApis().map((a) => ({ kind: 'api', name: a.name }))],
    };
  });

  app.post('/sites/:siteId/connectors', { preHandler: requireSite('ADMIN') }, async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    const b = createBody.parse(req.body);
    if (await prisma.connector.findUnique({ where: { siteId_name: { siteId, name: b.name } } })) {
      return reply.code(409).send({ error: `A connector named "${b.name}" already exists.` });
    }
    const c = await prisma.connector.create({
      data: { siteId, kind: b.kind, name: b.name, url: b.url, description: b.description, tokenHeader: b.tokenHeader, allowWrites: b.kind === 'mcp' && b.allowWrites, tokenEnc: b.token ? encrypt(b.token) : null },
    });
    app.log.info({ connector: { site: siteId, kind: c.kind, name: c.name } }, 'connector added');
    return reply.code(201).send(view(c));
  });

  app.patch('/sites/:siteId/connectors/:id', { preHandler: requireSite('ADMIN') }, async (req, reply) => {
    const { siteId, id } = req.params as { siteId: string; id: string };
    const b = updateBody.parse(req.body);
    const cur = await prisma.connector.findFirst({ where: { id, siteId } });
    if (!cur) return reply.code(404).send({ error: 'Not found' });
    if (b.name && b.name !== cur.name && (await prisma.connector.findUnique({ where: { siteId_name: { siteId, name: b.name } } }))) {
      return reply.code(409).send({ error: `A connector named "${b.name}" already exists.` });
    }
    const c = await prisma.connector.update({
      where: { id },
      data: {
        ...(b.name !== undefined && { name: b.name }),
        ...(b.url !== undefined && { url: b.url }),
        ...(b.description !== undefined && { description: b.description }),
        ...(b.tokenHeader !== undefined && { tokenHeader: b.tokenHeader }),
        ...(b.allowWrites !== undefined && { allowWrites: cur.kind === 'mcp' && b.allowWrites }),
        ...(b.token ? { tokenEnc: encrypt(b.token) } : b.clearToken ? { tokenEnc: null } : {}),
      },
    });
    forgetServer(cur.name);
    return view(c);
  });

  app.delete('/sites/:siteId/connectors/:id', { preHandler: requireSite('ADMIN') }, async (req, reply) => {
    const { siteId, id } = req.params as { siteId: string; id: string };
    const cur = await prisma.connector.findFirst({ where: { id, siteId } });
    if (cur) { await prisma.connector.delete({ where: { id } }); forgetServer(cur.name); }
    return reply.code(204).send();
  });

  /** Tries the connector and says what it found: how many tools (MCP) or the HTTP status (API). */
  app.post('/sites/:siteId/connectors/:id/test', { preHandler: requireSite('ADMIN') }, async (req, reply) => {
    const { siteId, id } = req.params as { siteId: string; id: string };
    const c = await prisma.connector.findFirst({ where: { id, siteId } });
    if (!c) return reply.code(404).send({ error: 'Not found' });
    const token = decrypt(c.tokenEnc);
    try {
      if (c.kind === 'mcp') {
        forgetServer(c.name);
        const r = await listTools([{ name: c.name, url: c.url, token, allowWrites: c.allowWrites }]);
        if (r.errors.length) return { ok: false, message: r.errors[0] };
        return { ok: true, message: `Connected. ${r.tools.length} tool${r.tools.length === 1 ? '' : 's'} available${r.hidden ? `, ${r.hidden} hidden (not marked read-only)` : ''}.`, tools: r.tools.map((t) => t.name).slice(0, 12) };
      }
      const out = await callApi([{ name: c.name, baseUrl: c.url, token, tokenHeader: c.tokenHeader || undefined }], c.name, '/');
      const status = out.split('\n', 1)[0];
      return { ok: /HTTP 2\d\d/.test(status), message: /HTTP 2\d\d/.test(status) ? `Connected (${status}).` : `The API answered ${status}. Check the address and key.` };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  });
}
