import { useEffect, useRef, useState } from 'react';
import type { Site, User } from '../api';
import { initialsOf, shownEmail } from '../lib/people';
import { clearProfilePic, saveProfilePic, useProfilePic } from '../lib/profilePic';

export function Avatar({ user, size = 30 }: { user: User; size?: number }) {
  const pic = useProfilePic(user.id);
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} aria-hidden>
      {pic ? <img src={pic} alt="" /> : initialsOf(user.name)}
    </span>
  );
}

/** The person at the top right: name, type of user, email, a new picture, and sign out. */
export function ProfileMenu({ user, site, onSignOut }: { user: User; site?: Site; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const pic = useProfilePic(user.id);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);

  async function pick(f: File | undefined) {
    if (!f) return;
    setErr('');
    try { await saveProfilePic(user.id, f); } catch (x) { setErr((x as Error).message); }
    if (file.current) file.current.value = '';
  }

  return (
    <div className="profile" ref={box}>
      <button className={`me-btn${open ? ' on' : ''}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => { setOpen((o) => !o); setErr(''); }}>
        <Avatar user={user} />
        <span className="me-name">{user.name}</span>
        <svg className="me-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {open && (
        <div className="profile-pop" role="dialog" aria-label="Your profile">
          <div className="pp-head">
            <span className="pp-pic">
              <Avatar user={user} size={76} />
              <button className="pp-cam" onClick={() => file.current?.click()} aria-label={pic ? 'Change profile picture' : 'Add a profile picture'} data-tip={pic ? 'Change picture' : 'Add a picture'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="3.5" /></svg>
              </button>
            </span>
            <b className="pp-name">{user.name}</b>
            <span className="pp-mail">{shownEmail(user.email)}</span>
            <span className="pp-tag">{user.isSuperAdmin ? 'Super admin' : 'Team member'}</span>
          </div>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
          {err && <p className="err pp-err">{err}</p>}

          <ul className="pp-menu">
            {pic && <li><button onClick={() => clearProfilePic(user.id)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m6 6 1 14h10l1-14" /></svg>
              Remove picture
            </button></li>}
            <li><button className="pp-signout" onClick={onSignOut}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
              Log out
            </button></li>
          </ul>
        </div>
      )}
    </div>
  );
}
