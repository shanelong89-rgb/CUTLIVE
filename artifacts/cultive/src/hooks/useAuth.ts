import { useEffect, useState } from 'react';
import { supabase, isAdmin as checkIsAdmin } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

const REMEMBER_ME_KEY = 'cultive-remember-me';
const SESSION_ACTIVE_KEY = 'cultive-session-active';

function isRemembered(): boolean {
  try {
    return localStorage.getItem(REMEMBER_ME_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // ── DEBUG ─────────────────────────────────────────────────
    const rememberVal = localStorage.getItem(REMEMBER_ME_KEY);
    const sessionFlag = sessionStorage.getItem(SESSION_ACTIVE_KEY);
    console.log('[auth] startup — cultive-remember-me:', rememberVal,
      '| cultive-session-active:', sessionFlag,
      '| URL:', window.location.href);
    // ─────────────────────────────────────────────────────────

    const apply = (s: Session | null) => {
      if (!mounted) return;
      console.log('[auth] apply — session:', s ? `user=${s.user.email}` : 'null');

      if (s) {
        sessionStorage.setItem(SESSION_ACTIVE_KEY, '1');
      } else {
        sessionStorage.removeItem(SESSION_ACTIVE_KEY);
      }

      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);

      // Admin check is fast (email comparison + localStorage, no network).
      // Run it async so it never delays auth loading.
      if (s?.user) {
        checkIsAdmin().then(admin => { if (mounted) setIsAdminUser(admin); });
      } else {
        setIsAdminUser(false);
      }
    };

    // Skip the startup signOut when we're inside a popup window (e.g. Google OAuth callback).
    // The popup has its own empty sessionStorage so the flag is never set there, and calling
    // signOut() from the popup would clear the session for the parent window too.
    const isPopup = window.opener !== null;
    if (!isPopup && !isRemembered() && !sessionStorage.getItem(SESSION_ACTIVE_KEY)) {
      console.log('[auth] startup signOut — remember-me is false and no session flag');
      supabase.auth.signOut();
    }

    supabase.auth.getSession().then(({ data }) => {
      console.log('[auth] getSession returned:', data.session ? `user=${data.session.user.email}` : 'null');
      apply(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((evt, s) => {
      console.log('[auth] onAuthStateChange —', evt, s ? `user=${s.user.email}` : 'null');
      apply(s);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data }) => {
          if (mounted) apply(data.session);
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { session, user, isAdmin: isAdminUser, loading };
}
