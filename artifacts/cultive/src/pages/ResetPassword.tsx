import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Stage = 'waiting' | 'ready' | 'saving' | 'done' | 'error' | 'invalid';

export function ResetPassword() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('waiting');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Supabase fires PASSWORD_RECOVERY when the user arrives via a reset link.
  // The SDK automatically exchanges the token in the URL hash for a session.
  useEffect(() => {
    // In case the session is already established (e.g. page reload after landing)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStage('ready');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStage('ready');
      if (event === 'SIGNED_OUT') setStage('invalid');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);
    if (password.length < 8) {
      setErrMsg('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setErrMsg('Passwords do not match.');
      return;
    }
    setStage('saving');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrMsg(error.message);
      setStage('ready');
    } else {
      setStage('done');
      setTimeout(() => navigate('/'), 2500);
    }
  };

  return (
    <div className="account-page" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="account-card" style={{ maxWidth: 420, width: '100%' }}>

        {stage === 'waiting' && (
          <>
            <div className="account-section-label">RESET PASSWORD</div>
            <p className="account-meta-value" style={{ marginTop: 12 }}>Verifying your reset link…</p>
          </>
        )}

        {stage === 'invalid' && (
          <>
            <div className="account-section-label">LINK EXPIRED</div>
            <p className="account-meta-value" style={{ marginTop: 12, color: 'var(--n-muted)' }}>
              This password reset link has expired or already been used. Request a new one from your Account page.
            </p>
            <button className="account-action-btn" style={{ marginTop: 24 }} onClick={() => navigate('/account')}>
              Back to Account
            </button>
          </>
        )}

        {(stage === 'ready' || stage === 'saving') && (
          <>
            <div className="account-section-label">SET NEW PASSWORD</div>
            <p className="account-meta-value" style={{ marginTop: 8, marginBottom: 24, color: 'var(--n-muted)' }}>
              Choose a strong password for your account.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  autoFocus
                  autoComplete="new-password"
                  disabled={stage === 'saving'}
                />
              </div>
              <div className="form-group">
                <label>Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your new password"
                  required
                  autoComplete="new-password"
                  disabled={stage === 'saving'}
                />
              </div>
              {errMsg && (
                <p style={{ color: '#c0392b', fontSize: 14 }}>{errMsg}</p>
              )}
              <button
                type="submit"
                className="account-action-btn"
                disabled={stage === 'saving'}
              >
                {stage === 'saving' ? 'Saving…' : 'Update Password'}
              </button>
            </form>
          </>
        )}

        {stage === 'done' && (
          <>
            <div className="account-section-label">PASSWORD UPDATED</div>
            <p className="account-meta-value" style={{ marginTop: 12, color: 'var(--n-muted)' }}>
              Your password has been changed. Redirecting you home…
            </p>
          </>
        )}

      </div>
    </div>
  );
}
