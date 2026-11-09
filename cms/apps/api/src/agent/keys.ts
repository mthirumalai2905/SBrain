import { prisma } from '../db.js';
import { PROVIDERS, keyFor, modelFor, type ProviderId } from './models.js';
import { decrypt } from './secret.js';

/**
 * AI provider keys. A key saved in Settings (stored encrypted, per site) wins; otherwise the one in apps/api/.env is
 * used. Keys are decrypted only here, on the server, when a request is made to the provider.
 */
export interface Credential { key: string; model: string; source: 'settings' | 'env' | 'none' }

export async function resolveCredential(siteId: string, provider: ProviderId): Promise<Credential> {
  const row = await prisma.connector.findUnique({ where: { siteId_name: { siteId, name: provider } } });
  if (row && row.kind === 'ai') {
    const key = decrypt(row.tokenEnc);
    if (key) return { key, model: row.description || modelFor(provider), source: 'settings' };
  }
  const key = keyFor(provider);
  // a model chosen in Settings still applies when the key itself comes from .env
  const model = row && row.kind === 'ai' && row.description ? row.description : modelFor(provider);
  return { key, model, source: key ? 'env' : 'none' };
}

export const allProviders = () => PROVIDERS.map((p) => ({ id: p.id as ProviderId, label: p.label, keyEnv: p.keyEnv, defaultModel: modelFor(p.id) }));
