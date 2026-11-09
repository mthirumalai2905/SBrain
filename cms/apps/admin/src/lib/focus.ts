/** Scrolls to a field in the editing panel (by its edit path), opens any list item it sits in, and focuses it. */
export function focusPath(path: string) {
  setTimeout(() => {
    const el = [...document.querySelectorAll<HTMLElement>('[data-field-path]')].find((x) => x.dataset.fieldPath === path);
    if (!el) return;
    for (let d = el.closest('details'); d; d = d.parentElement?.closest('details') ?? null) d.open = true;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.querySelector<HTMLElement>('input, textarea, select')?.focus({ preventScroll: true });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1400);
  }, 80);
}
