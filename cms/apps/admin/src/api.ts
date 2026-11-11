export const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';
export type FieldType = 'text' | 'textarea' | 'richtext' | 'number' | 'boolean' | 'date' | 'image' | 'video' | 'color' | 'icon' | 'select' | 'json' | 'array';
export interface Field { name: string; label?: string; type: FieldType; required?: boolean; options?: string[]; /** shown together with the fields next to it that have the same group */ group?: string; /** type "array": the fields of each item */ fields?: Field[] }
export interface User { id: string; email: string; name: string; isSuperAdmin: boolean }
export interface Site { id: string; name: string; slug: string; domains: string[]; previewUrl?: string | null; apiKey?: string; role: Role }
export interface ContentType { id: string; name: string; slug: string; fields: Field[]; kind?: 'collection' | 'singleton' | 'page' | 'section' }
export interface Entry { id: string; contentTypeId: string; slug: string | null; data: Record<string, unknown>; status: 'DRAFT' | 'PUBLISHED'; createdAt: string; updatedAt: string }
export interface Section { id: string; type: string; data: Record<string, unknown> }
export interface Media { id: string; originalName: string; mimeType: string; size: number; url: string }
export interface Member { userId: string; email: string; name: string; role: Role }

const TOKEN = 'cms_token';
export const getToken = () => localStorage.getItem(TOKEN);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN));

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(API + path, {
    method: init.method ?? (init.body !== undefined || init.form ? 'POST' : 'GET'),
    headers,
    body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
  });
  if (res.status === 401 && token) {
    setToken(null);
    location.reload();
  }
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw Object.assign(new Error(j.error ?? `Request failed (${res.status})`), { code: j.code as string | undefined });
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
