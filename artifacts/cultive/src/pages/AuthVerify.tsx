import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { verifyWhatsAppMagicLink } from '../lib/supabase';

type Stage = 'checking' | 'success' | 'error';

/**
 * Landing page for the WhatsApp magic-link flow.
 * The webhook sends: cultive.city/auth/verify?phone=...&token=...
 * We verify phone+token against wa_links (via a SECURITY DEFINER RPC that
 * also clears the one-time code) and, on success, store a lightweight
 * app-level session before redirecting to Account.
 */
export function AuthVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('checking');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    const phone = searchParams.get('phone') ?? '';
    const token = searchParams.get('token') ?? '';

    verifyWhatsAppMagicLink(phone, token).then((result) => {
      if (result.ok) {
        setStage('success');
        setTimeout(() => navigate('/account'), 1800);
      } else {
        setErrMsg(result.error ?? 'This link is invalid or has expired.');
        setStage('error');
      }
    });
  }, [searchParams, navigate]);

  return (
    <div className="account-page" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="account-card" style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div className="account-section-label">WHATSAPP LOGIN</div>

        {stage === 'checking' && (
          <p className="account-meta-value" style={{ marginTop: 12 }}>Verifying your link…</p>
        )}

        {stage === 'success' && (
          <>
            <p className="account-meta-value" style={{ marginTop: 12, fontWeight: 600 }}>You're in! 🎉</p>
            <p className="account-meta-value" style={{ marginTop: 8, color: '#888' }}>Taking you to your account…</p>
          </>
        )}

        {stage === 'error' && (
          <>
            <p className="account-meta-value" style={{ marginTop: 12, color: '#c0392b' }}>{errMsg}</p>
            <Link to="/" className="account-invite-copy" style={{ display: 'inline-block', marginTop: 16 }}>
              Back to CULTIVE
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
