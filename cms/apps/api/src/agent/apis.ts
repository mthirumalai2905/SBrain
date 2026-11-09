/**
 * API sources: REST APIs you configure in apps/api/.env so the assistant can read data from them.
 *
 *   API_SOURCES=[{"name":"products","baseUrl":"https://api.example.com/v1","token":"...","tokenHeader":"authorization","description":"Product catalogue"}]
 *
 * Safety: read-only (GET only), and only the configured host can be contacted, so the AI cannot be steered to another
 * address. Keys stay on the server. Whatever an API returns is treated as data, never as instructions.
 */
export interface ApiSource { name: string; baseUrl: string; token?: string; tokenHeader?: string; headers?: Record<string, string>; description?: string }

export function configuredApis(): ApiSource[] {
  const raw = process.env.API_SOURCES;
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as ApiSource[]).filter(
      (s) => s && typeof s.name === 'string' && /^[\w-]{1,24}$/.test(s.name) && typeof s.baseUrl === 'string' && /^https?:\/\//.test(s.baseUrl),
    );
  } catch {
    return [];
  }
}

const MAX_CHARS = 20_000;

export async function callApi(sources: ApiSource[], sourceName: string, path: string, query?: Record<string, unknown>): Promise<string> {
  const source = sources.find((s) => s.name === sourceName);
  if (!source) throw new Error(`Unknown API source "${sourceName}"`);
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.includes('..') || /[\s\\]/.test(path)) {
    throw new Error('The path must start with a single "/" and stay inside the API.');
  }
  const base = new URL(source.baseUrl);
  const url = new URL(base.toString().replace(/\/$/, '') + path);
  if (url.origin !== base.origin) throw new Error('That address is outside the configured API.');
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));

  const headers: Record<string, string> = { accept: 'application/json, text/plain;q=0.9', 'user-agent': 'synx-brain/0.1', ...(source.headers ?? {}) };
  if (source.token) {
    const h = (source.tokenHeader ?? 'authorization').toLowerCase();
    headers[h] = h === 'authorization' ? `Bearer ${source.token}` : source.token;
  }

  let target = url;
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(target, { method: 'GET', headers, redirect: 'manual', signal: AbortSignal.timeout(20_000) });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('location');
      if (!next) break;
      const resolved = new URL(next, target);
      if (resolved.origin !== base.origin) throw new Error('The API redirected somewhere else, so the request was stopped.');
      target = resolved;
      continue;
    }
    const type = res.headers.get('content-type') ?? '';
    if (!/json|text|xml|csv/i.test(type)) throw new Error(`The API returned ${type || 'an unknown type'}, which cannot be read as text.`);
    const body = await res.text();
    const text = body.length > MAX_CHARS ? body.slice(0, MAX_CHARS) + '\n[Cut off]' : body;
    return `HTTP ${res.status}\n${text}`;
  }
  throw new Error('Could not read the API (too many redirects).');
}
