import { prisma } from '../db.js';
import { ENABLED_PROVIDERS, PROVIDERS, keyFor, modelFor, type ProviderId } from './models.js';
import { decrypt } from './secret.js';

/**
 * AI provider keys, shared by every site. A site's own key (saved in its Settings, stored encrypted) wins; a site
 * without one uses the key saved on any other site; failing that, the one in apps/api/.env is used. Keys are
 * decrypted only here, on the server, when a request is made to the provider.
 */
export interface Credential { key: string; model: string; source: 'settings' | 'shared' | 'env' | 'none'; /** for a shared key: the site it was saved on */ from?: string }

export async function resolveCredential(siteId: string, provider: ProviderId): Promise<Credential> {
  const row = await prisma.connector.findUnique({ where: { siteId_name: { siteId, name: provider } } });
  if (row && row.kind === 'ai') {
    const key = decrypt(row.tokenEnc);
    if (key) return { key, model: row.description || modelFor(provider), source: 'settings' };
  }
  const own = row && row.kind === 'ai' ? row : null;
  // no key of its own: use the one saved on another site (the first one added), with that site's model unless this site chose one
  const other = await prisma.connector.findFirst({
    where: { kind: 'ai', name: provider, tokenEnc: { not: null }, siteId: { not: siteId } },
    orderBy: { createdAt: 'asc' },
    include: { site: { select: { name: true } } },
  });
  const shared = other ? decrypt(other.tokenEnc) : undefined;
  if (other && shared) return { key: shared, model: own?.description || other.description || modelFor(provider), source: 'shared', from: other.site.name };
  const key = keyFor(provider);
  // a model chosen in Settings still applies when the key itself comes from .env
  const model = own?.description ? own.description : modelFor(provider);
  return { key, model, source: key ? 'env' : 'none' };
}

export const allProviders = () => PROVIDERS.filter((p) => ENABLED_PROVIDERS.includes(p.id)).map((p) => ({ id: p.id as ProviderId, label: p.label, keyEnv: p.keyEnv, defaultModel: modelFor(p.id) }));
