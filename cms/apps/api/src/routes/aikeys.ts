import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireSite } from '../auth.js';
import { encrypt, decrypt } from '../agent/secret.js';
import { PROVIDERS, isEnabled, providerInfo, type ProviderId } from '../agent/models.js';
import { allProviders, resolveCredential } from '../agent/keys.js';

const provider = z.enum(['anthropic', 'openai', 'gemini']).refine(isEnabled, 'That AI model is turned off.');
const body = z.object({
  key: z.string().trim().min(8, 'That key looks too short.').max(500).optional(),
  model: z.string().trim().regex(/^[\w.:/-]{0,80}$/, 'Model names use letters, digits and . : / - _').optional(),
});

/** The last four characters, so you can recognise which key is saved, and nothing more. */
const hint = (key?: string) => (key ? '••••' + key.slice(-4) : undefined);

const baseUrl = (env: string, fallback: string) => {
  const v = process.env[env] || fallback;
  return v.endsWith('/') ? v.slice(0, -1) : v;
};

/** Asks the provider for its model list, which needs a valid key but costs nothing. */
async function check(p: ProviderId, key: string, model: string, defaultModel: string): Promise<{ ok: boolean; message: string }> {
  const req: { url: string; headers: Record<string, string> } =
    p === 'anthropic' ? { url: baseUrl('ANTHROPIC_BASE_URL', 'https://api.anthropic.com') + '/v1/models?limit=1', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } }
    : p === 'openai' ? { url: baseUrl('OPENAI_BASE_URL', 'https://api.openai.com/v1') + '/models', headers: { authorization: `Bearer ${key}` } }
    : { url: baseUrl('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com') + '/v1beta/models?pageSize=1', headers: { 'x-goog-api-key': key } };
  try {
    const res = await fetch(req.url, { headers: req.headers, signal: AbortSignal.timeout(15_000) });
    if (res.ok) {
      // the key is fine; now check the model it will be asked to use
      const one =
        p === 'anthropic' ? baseUrl('ANTHROPIC_BASE_URL', 'https://api.anthropic.com') + '/v1/models/' + encodeURIComponent(model)
        : p === 'openai' ? baseUrl('OPENAI_BASE_URL', 'https://api.openai.com/v1') + '/models/' + encodeURIComponent(model)
        : baseUrl('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com') + '/v1beta/models/' + encodeURIComponent(model);
      const m = await fetch(one, { headers: req.headers, signal: AbortSignal.timeout(15_000) }).catch(() => null);
      if (m && (m.status === 404 || m.status === 400)) {
        return { ok: false, message: `The key works, but the model "${model}" is not available for it. Type another model name in the Model box${model === defaultModel ? '' : ` (or clear the box to use ${defaultModel})`}.` };
      }
      return { ok: true, message: `The key works and "${model}" is available.` };
    }
    if (res.status === 401 || res.status === 403 || res.status === 400) return { ok: false, message: `${providerInfo(p)!.label} rejected this key (${res.status}). Check that it is copied in full.` };
    return { ok: false, message: `${providerInfo(p)!.label} answered ${res.status}. Try again in a moment.` };
  } catch {
    return { ok: false, message: `Could not reach ${providerInfo(p)!.label}. Check the internet connection.` };
  }
}

export default async function (app: FastifyInstance) {
  app.get('/sites/:siteId/ai-keys', { preHandler: requireSite('ADMIN') }, async (req) => {
    const { siteId } = req.params as { siteId: string };
    const siteCount = await prisma.site.count();
    return Promise.all(allProviders().map(async (p) => {
      const c = await resolveCredential(siteId, p.id);
      // how many OTHER sites rely on this site's key (they have none of their own)
      let sharedWith = 0;
      if (c.source === 'settings') {
        const withOwn = await prisma.connector.count({ where: { kind: 'ai', name: p.id, tokenEnc: { not: null }, siteId: { not: siteId } } });
        sharedWith = Math.max(0, siteCount - 1 - withOwn);
      }
      return {
        provider: p.id, label: p.label, source: c.source, from: c.from, sharedWith, hint: hint(c.key), model: c.model, defaultModel: p.defaultModel, keyEnv: p.keyEnv,
        modelCustom: c.model !== p.defaultModel,
      };
    }));
  });

  app.put('/sites/:siteId/ai-keys/:provider', { preHandler: requireSite('ADMIN') }, async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    const p = provider.parse((req.params as { provider: string }).provider);
    const b = body.parse(req.body);
    const cur = await prisma.connector.findUnique({ where: { siteId_name: { siteId, name: p } } });
    const data = {
      ...(b.key ? { tokenEnc: encrypt(b.key) } : {}),
      ...(b.model !== undefined ? { description: b.model } : {}),
    };
    if (!cur) {
      if (!b.key) return reply.code(400).send({ error: 'Paste the key to save it.' });
      await prisma.connector.create({ data: { siteId, kind: 'ai', name: p, url: `ai:${p}`, ...data } });
    } else {
      await prisma.connector.update({ where: { id: cur.id }, data });
    }
    app.log.info({ aiKey: { site: siteId, provider: p } }, 'AI key saved');
    const c = await resolveCredential(siteId, p);
    return { provider: p, source: c.source, hint: hint(c.key), model: c.model };
  });

  app.delete('/sites/:siteId/ai-keys/:provider', { preHandler: requireSite('ADMIN') }, async (req, reply) => {
    const { siteId } = req.params as { siteId: string };
    const p = provider.parse((req.params as { provider: string }).provider);
    await prisma.connector.deleteMany({ where: { siteId, name: p, kind: 'ai' } });
    return reply.code(204).send();
  });

  app.post('/sites/:siteId/ai-keys/:provider/test', { preHandler: requireSite('ADMIN') }, async (req) => {
    const { siteId } = req.params as { siteId: string };
    const p = provider.parse((req.params as { provider: string }).provider);
    const row = await prisma.connector.findUnique({ where: { siteId_name: { siteId, name: p } } });
    // a key typed but not yet saved can be tested too
    const typed = z.object({ key: z.string().trim().min(8).max(500).optional() }).safeParse(req.body ?? {});
    const key = (typed.success && typed.data.key) || (row?.kind === 'ai' ? decrypt(row.tokenEnc) : undefined) || (await resolveCredential(siteId, p)).key;
    if (!key) return { ok: false, message: 'There is no key to test yet.' };
    const cred = await resolveCredential(siteId, p);
    return check(p, key, cred.model, allProviders().find((x) => x.id === p)!.defaultModel);
  });
}

export const _providers = PROVIDERS;
