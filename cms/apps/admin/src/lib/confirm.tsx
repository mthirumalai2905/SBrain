import { useEffect, useRef, useState } from 'react';

/**
 * Our own confirmation popup, in place of the browser's confirm box.
 *
 *   if (await ask({ title: 'Delete page?', message: 'It cannot be undone.', confirmLabel: 'Delete', tone: 'danger' })) ...
 *
 * `<ConfirmHost />` is mounted once (in main.tsx) and shows whatever is asked.
 */
export interface AskOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger (the default) = red button, and focus starts on Cancel; primary = blue button, and focus starts on the confirm button. */
  tone?: 'danger' | 'primary';
}

interface Pending extends AskOptions { resolve: (ok: boolean) => void }

let show: ((p: Pending) => void) | null = null;

export function ask(options: AskOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!show) { resolve(false); return; } // host not mounted: do nothing rather than act without asking
    show({ ...options, resolve });
  });
}

export function ConfirmHost() {
  const [queue, setQueue] = useState<Pending[]>([]);
  useEffect(() => {
    show = (p) => setQueue((q) => [...q, p]);
    return () => { show = null; };
  }, []);
  const current = queue[0];
  const confirmBtn = useRef<HTMLButtonElement>(null);
  const cancelBtn = useRef<HTMLButtonElement>(null);

  const answer = (ok: boolean) => {
    current?.resolve(ok);
    setQueue((q) => q.slice(1));
  };

  useEffect(() => {
    if (!current) return;
    (current.tone === 'primary' ? confirmBtn : cancelBtn).current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); answer(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current]);

  if (!current) return null;
  const danger = current.tone !== 'primary';
  return (
    <div className="overlay" onClick={() => answer(false)}>
      <div className="dialog confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-msg" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-body">
          <span className={`confirm-icon ${danger ? 'danger' : 'info'}`} aria-hidden>{danger ? '!' : 'i'}</span>
          <div>
            <h3 id="confirm-title">{current.title}</h3>
            {current.message && <p id="confirm-msg" className="muted">{current.message}</p>}
          </div>
        </div>
        <div className="confirm-actions">
          <button ref={cancelBtn} onClick={() => answer(false)}>{current.cancelLabel ?? 'Cancel'}</button>
          <button ref={confirmBtn} className={danger ? 'danger-btn' : 'primary'} onClick={() => answer(true)}>{current.confirmLabel ?? 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}
