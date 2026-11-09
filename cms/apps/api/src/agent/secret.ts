import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Connector tokens are stored encrypted (AES-256-GCM), with a key derived from CONNECTOR_KEY, or from JWT_SECRET if
 * that is not set. They are only decrypted on the server at the moment a connector is used, and are never sent to
 * the browser or written to the log.
 */
const key = () => createHash('sha256').update('synx-brain-connectors:' + (process.env.CONNECTOR_KEY || process.env.JWT_SECRET || '')).digest();

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString('base64')).join('.');
}

/** The original text, or undefined if it cannot be decrypted (for example the key changed). */
export function decrypt(stored?: string | null): string | undefined {
  if (!stored) return undefined;
  try {
    const [iv, tag, body] = stored.split('.').map((p) => Buffer.from(p, 'base64'));
    const d = createDecipheriv('aes-256-gcm', key(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(body), d.final()]).toString('utf8');
  } catch {
    return undefined;
  }
}
