/**
 * Edit paths address one value in a page: "<target>.<field>[.<index>.<subfield>]".
 * <target> is "page" for the page's own fields, or a section's id. Example: "7f3c….items.2.title".
 */
export function setAtPath<T>(root: T, parts: string[], value: unknown): T {
  if (!parts.length) return value as T;
  const [head, ...rest] = parts;
  if (Array.isArray(root) || (root === undefined && /^\d+$/.test(head))) {
    const arr = [...((root as unknown[]) ?? [])];
    const i = Number(head);
    arr[i] = setAtPath(arr[i], rest, value);
    return arr as T;
  }
  const obj = { ...((root as Record<string, unknown>) ?? {}) };
  obj[head] = setAtPath(obj[head], rest, value);
  return obj as T;
}
