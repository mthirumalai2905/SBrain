import { useSyncExternalStore } from 'react';

/** The profile picture is kept in this browser, per user. It is shrunk to a small square first. */
const key = (userId: string) => `cms_avatar_${userId}`;
const listeners = new Set<() => void>();
const read = (userId: string) => { try { return localStorage.getItem(key(userId)); } catch { return null; } };

export function useProfilePic(userId: string) {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => read(userId),
    () => null,
  );
}

export function clearProfilePic(userId: string) {
  try { localStorage.removeItem(key(userId)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

/** Crops the middle square of the picture, shrinks it to 160px and keeps it. Throws a readable message when it cannot. */
export async function saveProfilePic(userId: string, file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file (JPG, PNG or WebP).');
  if (file.size > 10 * 1024 * 1024) throw new Error('That picture is over 10 MB. Choose a smaller one.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('That file could not be read as a picture.')); i.src = url; });
    const side = Math.min(img.width, img.height);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 160;
    canvas.getContext('2d')!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 160, 160);
    const data = canvas.toDataURL('image/jpeg', 0.86);
    try { localStorage.setItem(key(userId), data); } catch { throw new Error('This browser would not store the picture (storage is full or blocked).'); }
    listeners.forEach((l) => l());
  } finally { URL.revokeObjectURL(url); }
}
