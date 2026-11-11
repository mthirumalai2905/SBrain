import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireSite, requireSuperAdmin } from '../auth.js';
import { decrypt, encrypt } from '../agent/secret.js';

/**
 * Keys that let AI tools (Claude, ChatGPT/Codex, Gemini, Cursor, VS Code, Windsurf, anything that speaks MCP) use the CMS.
 * One key per tool, so one can be removed without touching the others. A key reaches one site, or every site.
 * The key is stored encrypted so it can be shown again; requests are checked by its hash. Keys made earlier (hash only)
 * keep working but cannot be shown.
 *
 * What a key may do: "read"; "draft" (read, create and edit drafts); "publish" (the same, plus change live pages and
 * publish, but only after the user confirms in the AI tool).
 */
export const hashKey = (k: string) => createHash('sha256').update(k).digest('hex');
export const mcpAddress = () => `${(process.env.PUBLIC_URL || 'http://localhost:4000').replace(/\/$/, '')}/mcp`;

export const TOOLS = { claude: 'Claude (web and desktop app)', 'claude-code': 'Claude Code', chatgpt: 'ChatGPT', codex: 'Codex CLI', gemini: 'Gemini CLI', cursor: 'Cursor', vscode: 'VS Code (Copilot)', windsurf: 'Windsurf', other: 'Another AI tool' } as const;
type Tool = keyof typeof TOOLS;

const createBody = z.object({
  tool: z.enum(Object.keys(TOOLS) as [Tool, ...Tool[]]).default('other'),
  perm: z.enum(['read', 'draft', 'publish']).default('draft'),
  label: z.string().trim().max(40).optional(),
});
const patchBody = z.object({ perm: z.enum(['read', 'draft', 'publish']).optional(), label: z.string().trim().min(1).max(40).optional() });

const view = (k: { id: string; tool: string; label: string; perm: string; last4: string; keyEnc: string | null; createdAt: Date }) => ({
  id: k.id, tool: k.tool, label: k.label, perm: k.perm, last4: k.last4, createdAt: k.createdAt, canShow: !!k.keyEnc,
});

export default async function (app: FastifyInstance) {
  type Guard = (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  /** The same five routes for one site's keys and for the all-sites keys. */
  function mount(prefix: string, guard: Guard, siteOf: (req: FastifyRequest) => string | null) {
    const scope = (req: FastifyRequest) => ({ siteId: siteOf(req) });

    app.get(prefix, { preHandler: guard }, async (req) => {
      const rows = await prisma.mcpKey.findMany({ where: scope(req), orderBy: { createdAt: 'asc' } });
      return { items: rows.map(view), address: mcpAddress(), tools: TOOLS };
    });

    app.post(prefix, { preHandler: guard }, async (req) => {
      const b = createBody.parse(req.body ?? {});
      const key = (siteOf(req) ? 'synxmcp_' : 'synxmcp_all_') + randomBytes(24).toString('base64url');
      const row = await prisma.mcpKey.create({
        data: { siteId: siteOf(req), tool: b.tool, label: b.label || TOOLS[b.tool], hash: hashKey(key), keyEnc: encrypt(key), perm: b.perm, last4: key.slice(-4) },
      });
      app.log.info({ mcpKey: { scope: siteOf(req) ?? 'all', tool: b.tool, perm: b.perm } }, 'AI tool key created');
      return { ...view(row), key };
    });

    /** Shows a key again. Only for keys made since keys were stored encrypted. */
    app.get(`${prefix}/:id/key`, { preHandler: guard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const row = await prisma.mcpKey.findFirst({ where: { id, ...scope(req) } });
      const key = row ? decrypt(row.keyEnc) : undefined;
      if (!key) return reply.code(404).send({ error: 'This key was made before keys could be shown again. Remove it and add a new one.' });
      return { key };
    });

    app.patch(`${prefix}/:id`, { preHandler: guard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const b = patchBody.parse(req.body ?? {});
      const row = await prisma.mcpKey.findFirst({ where: { id, ...scope(req) } });
      if (!row) return reply.code(404).send({ error: 'Not found' });
      return view(await prisma.mcpKey.update({ where: { id }, data: b }));
    });

    app.delete(`${prefix}/:id`, { preHandler: guard }, async (req, reply) => {
      const { id } = req.params as { id: string };
      await prisma.mcpKey.deleteMany({ where: { id, ...scope(req) } });
      return reply.code(204).send();
    });
  }

  mount('/sites/:siteId/mcp-keys', requireSite('ADMIN'), (req) => (req.params as { siteId: string }).siteId);
  mount('/mcp-keys', requireSuperAdmin, () => null);
}
