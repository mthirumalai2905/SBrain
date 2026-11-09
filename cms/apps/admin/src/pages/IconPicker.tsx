import { useEffect, useState } from 'react';
import type { Site } from '../api';
import { ICON_BARS, ICON_NAMES, ICON_PATHS, iconName } from '../lib/iconset';
import { MediaPicker } from './MediaPicker';

/** An icon from the built-in set, or an uploaded image. Empty shows "Default" (the icon the design ships with). */
export function IconView({ value, size = 24 }: { value?: string; size?: number }) {
  const name = iconName(value);
  if (name && ICON_BARS[name]) {
    const { bars, dx, dy, h } = ICON_BARS[name];
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="currentColor" aria-label={name}>
        <g transform={`translate(${dx} ${dy})`}>{bars.map(([x, y, w], i) => <rect key={i} x={x} y={y} width={w} height={h} rx={h / 2} />)}</g>
      </svg>
    );
  }
  if (name) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-label={name}>
        {ICON_PATHS[name].map((d, i) => <path key={i} d={d} />)}
      </svg>
    );
  }
  if (value) return <img src={value} alt="" width={size} height={size} style={{ objectFit: 'contain' }} />;
  return <span className="icon-default">Default</span>;
}

/** Choose a built-in icon, upload your own image, or go back to the design's default. */
export function IconPicker({ site, value, onPick, onClose }: { site: Site; value?: string; onPick: (v: string) => void; onClose: () => void }) {
  const [upload, setUpload] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !upload) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, upload]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" role="dialog" aria-label="Choose an icon" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <h3>Choose an icon</h3>
          <button className="link" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="dialog-tools">
          <button onClick={() => setUpload(true)}>Upload your own image…</button>
          <button className="link" onClick={() => onPick('')}>Use the default icon</button>
        </div>
        <div className="icon-grid">
          {ICON_NAMES.map((n) => (
            <button key={n} type="button" title={n} className={`icon-cell${value === `icon:${n}` ? ' on' : ''}`} onClick={() => onPick(`icon:${n}`)}>
              <IconView value={`icon:${n}`} size={24} />
              <span>{n}</span>
            </button>
          ))}
        </div>
      </div>
      {upload && <MediaPicker site={site} onClose={() => setUpload(false)} onPick={(url) => onPick(url)} />}
    </div>
  );
}

/** The editing-panel control for an icon field. */
export function IconField({ site, value, onChange }: { site: Site; value: string; onChange: (v: unknown) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="icon-field">
      <span className="icon-preview"><IconView value={value} size={26} /></span>
      <button type="button" onClick={() => setOpen(true)}>{value ? 'Change icon' : 'Choose icon'}</button>
      {value && <button type="button" className="link" onClick={() => onChange('')}>Use default</button>}
      {open && <IconPicker site={site} value={value} onClose={() => setOpen(false)} onPick={(v) => { onChange(v); setOpen(false); }} />}
    </div>
  );
}
