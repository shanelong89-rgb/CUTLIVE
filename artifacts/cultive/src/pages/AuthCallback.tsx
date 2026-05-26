import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Minimal page that the Google OAuth popup lands on.
 * Supabase detects the ?code= in the URL (detectSessionInUrl: true),
 * exchanges it for a session, and fires onAuthStateChange(SIGNED_IN)
 * in both this popup and the parent window (shared localStorage).
 * Once that fires — or after a short timeout — the popup closes itself.
 */
export function AuthCallback() {
  useEffect(() => {
    let closed = false;

    const close = () => {
      if (closed) return;
      closed = true;
      if (window.opener) {
        window.close();
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        sub.subscription.unsubscribe();
        close();
      }
    });

    // Safety fallback — close after 8 s even if the event never fires.
    const fallback = setTimeout(close, 8000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100vh', gap: 12,
      fontFamily: 'system-ui, sans-serif',
      color: '#555',
    }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
        style={{ animation: 'spin 1s linear infinite' }}>
        <circle cx="12" cy="12" r="10" stroke="#ddd" strokeWidth="3"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="#222" strokeWidth="3"
          strokeLinecap="round"/>
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ margin: 0, fontSize: '0.9rem' }}>Signing you in…</p>
    </div>
  );
}
