import { useSyncExternalStore } from 'react';
import { api, type Entry } from '../api';
import { ask } from './confirm';

/** The document whose version history the top bar button opens: set by whichever editor is open, cleared when it closes. */
export interface HistoryTarget {
  entryId: string;
  name: string;
  canEdit: boolean;
  /** Called after an older version was put back, so the editor can reload the restored content. */
  onRestored: (e: Entry) => void;
}

let target: HistoryTarget | null = null;
const listeners = new Set<() => void>();

export const setHistoryTarget = (t: HistoryTarget | null) => {
  target = t;
  listeners.forEach((f) => f());
};

export const useHistoryTarget = (): HistoryTarget | null =>
  useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => target, () => null);

/** "Nov 11, 2026, 03:49 PM" */
export const versionWhen = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
};

/** Asks first, then puts that version's content back. Resolves with the updated document, or null if the person said no. */
export async function restoreVersion(siteId: string, entryId: string, versionId: string, createdAt: string, actorName: string): Promise<Entry | null> {
  const ok = await ask({
    title: 'Restore this version?',
    message: `The content goes back to the version saved on ${versionWhen(createdAt)} by ${actorName}. The page keeps its current status, and this restore is added to the history, so you can undo it.`,
    confirmLabel: 'Restore', tone: 'primary',
  });
  if (!ok) return null;
  return api<Entry>(`/sites/${siteId}/entries/${entryId}/versions/${versionId}/restore`, { method: 'POST' });
}
