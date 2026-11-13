/** Reader notes from the CMS: the page-status notes, the cards pointing to other parts of the docs and the clarification banner. */
type Doc = Record<string, any>;
export let notes: Doc = {};
export function setNotes(doc?: Doc) {
  notes = doc ?? {};
}
export const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
