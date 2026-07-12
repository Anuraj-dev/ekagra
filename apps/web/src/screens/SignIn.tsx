import { type FormEvent, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { PrimaryButton } from '../components/ui';
import { color as tokens } from '../theme/tokens';

/** Map raw Supabase error messages to plain, sanitized copy. */
function sanitizeAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message.toLowerCase() : '';
  if (raw.includes('invalid login') || raw.includes('invalid credentials')) {
    return 'Wrong email or password.';
  }
  if (raw.includes('already registered') || raw.includes('already exists')) {
    return 'That email is already registered.';
  }
  if (raw.includes('network') || raw.includes('fetch') || raw.includes('timeout')) {
    return 'Network error — try again.';
  }
  return 'Something went wrong — try again.';
}

/** Minimal email/password gate. Supabase manages the session and JWT. */
export function SignIn() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setNotice(null);
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'in') {
        await signIn(trimmedEmail, password);
      } else {
        await signUp(trimmedEmail, password);
        setNotice('Account created — sign in.');
        setMode('in');
      }
    } catch (err) {
      setError(sanitizeAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="scroll" style={{ padding: '0 24px' }}>
      <div style={{ paddingTop: 120 }}>
        <div className="overline" style={{ color: tokens.ember }}>
          Ekagra
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.4px', marginTop: 10 }}>
          {mode === 'in' ? 'Sign in' : 'Create your account'}
        </h1>
      </div>

      <form
        onSubmit={submit}
        style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <Field label="Email" htmlFor="signin-email">
          <input
            id="signin-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Password" htmlFor="signin-password">
          <input
            id="signin-password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </Field>

        {error && (
          <div
            role="alert"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: tokens.danger,
              background: tokens.dangerDim,
              borderRadius: 12,
              padding: '12px 14px',
            }}
          >
            {error}
          </div>
        )}
        {notice && (
          <div style={{ fontSize: 13, fontWeight: 600, color: tokens.green }}>{notice}</div>
        )}

        <div style={{ marginTop: 8 }}>
          <PrimaryButton type="submit" disabled={busy}>
            {busy
              ? mode === 'in'
                ? 'Signing in…'
                : 'Creating…'
              : mode === 'in'
                ? 'Sign in'
                : 'Create account'}
          </PrimaryButton>
        </div>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === 'in' ? 'up' : 'in')}
        style={{ marginTop: 20, fontSize: 13, fontWeight: 700, color: tokens.t3 }}
      >
        {mode === 'in' ? 'Need an account? Create one' : 'Have an account? Sign in'}
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: tokens.surface,
  border: `1.5px solid ${tokens.line}`,
  borderRadius: 12,
  padding: 16,
  color: tokens.t1,
  fontSize: 15,
  fontWeight: 500,
};

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} style={{ display: 'block' }}>
      <span className="overline" style={{ color: tokens.t3, display: 'block', marginBottom: 8 }}>
        {label}
      </span>
      {children}
    </label>
  );
}
