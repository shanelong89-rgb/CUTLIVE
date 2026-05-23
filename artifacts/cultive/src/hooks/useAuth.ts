import { useEffect, useState } from 'react';
import { supabase, isAdmin as checkIsAdmin } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const apply = async (s: Session | null) => {
      if (!mounted) return;
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
