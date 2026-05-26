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

    const apply = async (s: Session | null) => {
      if (!mounted) return;

      // Keep the tab-lifetime sessionStorage marker in sync with the session.
      // This is how "remember me = OFF" knows whether this tab had an active
      // session before the user closed and reopened the browser.
      if (s) {
        sessionStorage.setItem(SESSION_ACTIVE_KEY, '1');
      } else {
        sessionStorage.removeItem(SESSION_ACTIVE_KEY);
      }

      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const admin = await checkIsAdmin();
        if (mounted) setIsAdminUser(admin);
      } else {
        setIsAdminUser(false);
      }
      if (mounted) setLoading(false);
    };

    // "Remember me = OFF" enforcement — startup check only, no beforeunload.
    //
    // How it works: when the user logs in with "remember me" unchecked we store
    // cultive-remember-me='false' in localStorage AND set a sessionStorage flag
    // while the tab is alive.  sessionStorage is cleared when the tab/window is
    // closed but survives refreshes within the same tab.
    //
    // So: if "don't remember me" is set AND the sessionStorage flag is gone,
    // the user must have closed the tab and come back — sign them out now.
    //
    // This replaces the old beforeunload approach which was unreliable and broke
    // Google OAuth by firing signOut() while the browser was navigating to Google.
    if (!isRemembered() && !sessionStorage.getItem(SESSION_ACTIVE_KEY)) {
      supabase.auth.signOut();
    }

    supabase.auth.getSession().then(({ data }) => apply(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      apply(s);
    });

    // Mobile Safari throttles timers when the tab is backgrounded, so the
    // auto-refresh token timer never fires while the user is in another app.
    // When they return, force a session refresh immediately so they stay
    // logged in instead of seeing the sign-in screen.
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
