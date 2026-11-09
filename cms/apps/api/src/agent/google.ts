/**
 * Reads a Google Doc, Sheet or Slides link that is shared as "Anyone with the link can view".
 * No Google sign-in is involved, so a private file is refused with a clear message.
 *
 * Only Google's own hosts are contacted (docs.google.com / drive.google.com and the hosts they redirect to),
 * so the AI cannot be steered into fetching an arbitrary address.
 */
const GOOGLE_HOST = /(^|\.)(google\.com|googleusercontent\.com)$/;
const MAX_CHARS = 60_000;

/** The text-export address for a Google file link, or an error message. */
export function exportAddress(link: string): { url: string; kind: string } | { error: string } {
  let u: URL;
  try { u = new URL(link.trim()); } catch { return { error: 'That is not a valid link.' }; }
  if (u.protocol !== 'https:' || !['docs.google.com', 'drive.google.com'].includes(u.hostname)) {
    return { error: 'Only Google Docs, Sheets or Slides links (docs.google.com) can be read.' };
  }
  const m = u.pathname.match(/^\/(document|spreadsheets|presentation)\/d\/([\w-]+)/);
  if (!m) return { error: 'Open the file in Google Docs, Sheets or Slides and paste that link (a plain Drive file cannot be read).' };
  const [, type, id] = m;
  if (type === 'document') return { kind: 'Google Doc', url: `https://docs.google.com/document/d/${id}/export?format=txt` };
  if (type === 'presentation') return { kind: 'Google Slides', url: `https://docs.google.com/presentation/d/${id}/export/txt` };
  const gid = u.searchParams.get('gid') ?? new URLSearchParams(u.hash.replace(/^#/, '')).get('gid') ?? '0';
  return { kind: 'Google Sheet', url: `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${encodeURIComponent(gid)}` };
}

export async function readGoogleFile(link: string): Promise<string> {
  const target = exportAddress(link);
  if ('error' in target) throw new Error(target.error);

  let url = target.url;
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20_000), headers: { 'user-agent': 'synx-brain/0.1' } });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('location');
      if (!next) break;
      const resolved = new URL(next, url);
      if (resolved.protocol !== 'https:' || !GOOGLE_HOST.test(resolved.hostname)) throw new Error('Google sent the request somewhere unexpected, so it was stopped.');
      // a redirect to the sign-in page means the file is private
      if (resolved.hostname === 'accounts.google.com') throw new Error(`This ${target.kind} is private. Share it as "Anyone with the link can view" and try again.`);
      url = resolved.toString();
      continue;
    }
    if (!res.ok) throw new Error(`Google returned ${res.status}. Check the link and that it is shared as "Anyone with the link can view".`);
    const type = res.headers.get('content-type') ?? '';
    if (type.includes('text/html')) throw new Error(`This ${target.kind} is private. Share it as "Anyone with the link can view" and try again.`);
    const text = (await res.text()).replace(/^﻿/, '').trim();
    if (!text) throw new Error(`The ${target.kind} is empty.`);
    return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + `\n\n[Cut off: the file is longer than ${MAX_CHARS} characters.]` : text;
  }
  throw new Error('Could not read the file (too many redirects).');
}
