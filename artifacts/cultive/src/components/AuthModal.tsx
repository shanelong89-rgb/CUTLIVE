import { useState, useEffect } from 'react';
import { signIn, signInWithGoogle, signUp, supabase } from '../lib/supabase';
import { track, getSignUpSource } from '../lib/analytics';

const REMEMBER_ME_KEY = 'cultive-remember-me';
const INVITE_BANNER_KEY = 'cultive:invite-banner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function hasInvitePending(): boolean {
  try { return sessionStorage.getItem(INVITE_BANNER_KEY) === '1'; } catch { return false; }
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const isInvite = hasInvitePending();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Switch to Sign Up tab when the modal opens with an invite pending.
  // We can't rely on useState's initial value because the modal mounts
  // before the sessionStorage flag is written (effects run after render).
  useEffect(() => {
    if (isOpen && hasInvitePending()) setMode('signup');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    track(mode === 'login' ? 'login_submitted' : 'sign_up_submitted', { method: 'email' });
    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        localStorage.setItem(REMEMBER_ME_KEY, String(rememberMe));
        track('login_completed', { method: 'email' });
        onClose();
      } else {
        const result = await signUp(email, password);
        if (result.session) {
          localStorage.setItem(REMEMBER_ME_KEY, 'true');
          track('sign_up_completed', { method: 'email' });
          track('sign_up', { method: 'email', source: getSignUpSource() });
          onClose();
        } else {
          track('sign_up_email_confirm_sent');
          track('sign_up', { method: 'email', source: getSignUpSource() });
          setNotice('Account created. Check your email to confirm, then sign in.');
          setMode('login');
        }
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'login' ? 'Good to see you again' : 'Create your account'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {isInvite && (
          <div className="auth-invite-notice">
            You were invited — sign up and <strong>you both get HK$25 credit</strong>
          </div>
        )}

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setErr(null); setNotice(null); }}
          >
            Log In
          </button>
          <button
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setErr(null); setNotice(null); }}
          >
            Sign Up
          </button>
        </div>

        {mode === 'signup' && (
          <p style={{ fontSize: '0.8rem', color: 'var(--n-muted)', marginBottom: 16, lineHeight: 1.5 }}>
            One tap. Saves you from scrambling Friday night.
          </p>
        )}

        <button
          type="button"
          onClick={async () => {
            track('google_auth_clicked', { mode });
            setBusy(true);
            setErr(null);
            try {
              await signInWithGoogle();
              // Only close the modal if a real session was established.
              // signInWithGoogle() resolves when the popup closes — which can
              // happen without a successful sign-in (user dismisses the popup,
              // popup blocked, etc.). Calling onClose() unconditionally was
              // closing the AuthModal even when no login occurred.
              const { data } = await supabase.auth.getSession();
              if (data.session) {
                track('login_completed', { method: 'google' });
                if (mode === 'signup') track('sign_up', { method: 'google', source: getSignUpSource() });
                onClose();
              } else {
                setErr('Google sign-in didn\'t complete. If you signed up with email and password, use the form below instead.');
                setBusy(false);
              }
            } catch (e: any) { setErr(e?.message ?? 'Google sign-in failed.'); setBusy(false); }
          }}
          disabled={busy}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, width: '100%', padding: '11px 16px', marginBottom: 16,
            border: '1px solid var(--n-border)', borderRadius: 6,
            background: 'var(--n-bg)', color: 'var(--n-text)',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--n-border)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>or continue with email</span>
          <div style={{ flex: 1, height: 1, background: 'var(--n-border)' }} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'login' && (
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              marginBottom: 16,
              borderRadius: 6,
              border: '1px solid var(--n-border)',
              cursor: 'pointer',
              userSelect: 'none',
            }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--n-text)', fontWeight: 500 }}>
                Remember me
              </span>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--n-text)', cursor: 'pointer' }}
              />
            </label>
          )}

          {err && (
            <p style={{ color: '#b91c1c', fontSize: '0.85rem', marginBottom: 12 }}>{err}</p>
          )}
          {notice && (
            <p style={{ color: '#166534', fontSize: '0.85rem', marginBottom: 12 }}>{notice}</p>
          )}
          <button type="submit" className="submit-btn" disabled={busy}>
            {busy ? '…' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErr(null); setNotice(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}
