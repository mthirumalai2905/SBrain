import { useEffect, useState, type FormEvent } from 'react';
import { api, setToken, type User } from '../api';

export function Login({ onDone }: { onDone: (u: User) => void }) {
  const [setup, setSetup] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');

  useEffect(() => { api<{ needsSetup: boolean }>('/auth/status').then((s) => setSetup(s.needsSetup)).catch((x: Error) => setErr(x.message === 'Failed to fetch' ? 'Cannot reach the API. Is it running on :4000?' : x.message)); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      if (setup) await api('/auth/register', { body: f });
      const r = await api<{ token: string; user: User }>('/auth/login', { body: { email: f.email, password: f.password } });
      setToken(r.token);
      onDone(r.user);
    } catch (x) { setErr((x as Error).message); }
  }

  return (
    <form className="card login" onSubmit={submit}>
      <h1>Synx Brain</h1>
      <p className="muted">{setup ? 'Create the first admin account.' : 'Sign in to continue.'}</p>
      {setup && <input placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />}
      <input type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
      <input type="password" placeholder="Password (8+ chars)" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
      {err && <p className="err">{err}</p>}
      <button className="primary">{setup ? 'Create account' : 'Sign in'}</button>
    </form>
  );
}
