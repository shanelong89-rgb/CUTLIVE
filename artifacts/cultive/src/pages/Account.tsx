import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { signOut, supabase } from '../lib/supabase';
import { useSavedEvents } from '../hooks/useSavedEvents';
import { useInboxMessages } from '../hooks/useInboxMessages';

interface AccountProps {
  setIsAuthOpen?: (open: boolean) => void;
}

function initialsFor(email?: string | null) {
  if (!email) return '·';
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/).filter(Boolean);
  const a = (parts[0]?.[0] ?? name[0] ?? '·').toUpperCase();
  const b = (parts[1]?.[0] ?? '').toUpperCase();
  return (a + b).slice(0, 2);
}

function formatDate(s?: string) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return s;
  }
}

export function Account({ setIsAuthOpen }: AccountProps) {
  const { user, isAdmin, loading } = useAuth();
  const { count: savedCount } = useSavedEvents();
  const { unreadCount } = useInboxMessages();
  const [submissionCount, setSubmissionCount] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      // Will be overwritten once we know the user ID, but avoids a flash on
      // repeated visits by reading the last-known count for any user.
      return null;
    } catch { return null; }
  });
  const [pwResetState, setPwResetState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleChangePassword = async () => {
    if (!user?.email || pwResetState === 'sending' || pwResetState === 'sent') return;
    setPwResetState('sending');
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    setPwResetState(error ? 'error' : 'sent');
  };

  useEffect(() => {
    if (!user) {
      setSubmissionCount(null);
      return;
    }
    const cacheKey = `cultive:sub-count:${user.id}`;
    // Show cached value immediately so there's no "—" flash on return visits.
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached !== null) setSubmissionCount(Number(cached));
    } catch { /* ignore */ }

    let active = true;
    (async () => {
      const filter = [
        user.id ? `user_id.eq.${user.id}` : null,
        user.email ? `submitter_email.eq.${user.email}` : null,
      ].filter(Boolean).join(',');
      if (!filter) { setSubmissionCount(0); return; }
      const { count } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .or(filter);
      if (!active) return;
      const n = count ?? 0;
      setSubmissionCount(n);
      try { localStorage.setItem(cacheKey, String(n)); } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, [user]);

  // ── Signed-out state ────────────────────────────────────────
  if (!loading && !user) {
    return (
      <div className="account-page">
        <div className="account-signed-out">
          <span className="account-eyebrow">— GUEST —</span>
          <h1 className="account-display-name">No Account</h1>
          <p className="account-tagline">
            Sign in to bookmark events, submit your own, and unlock members-only
            access across Hong Kong.
          </p>
          <button
            className="account-cta"
            onClick={() => setIsAuthOpen?.(true)}
          >
            Sign In / Sign Up
          </button>
          <p className="account-foot-note">
            CULTIVE · 文化活 · v1.0 · Made in Hong Kong
          </p>
        </div>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="account-page">
        <p className="account-tagline" style={{ textAlign: 'center', paddingTop: 80 }}>
          Loading…
        </p>
      </div>
    );
  }

  const email = user.email ?? '';
  const handle = email.split('@')[0];
  const joined = formatDate(user.created_at);

  const menuItems: { label: string; href?: string; meta?: string }[] = [
    { label: 'Saved Events', href: '/saved', meta: `${savedCount} saved` },
    { label: 'My Tickets', href: '/tickets', meta: '0 active' },
    {
      label: 'My Submissions',
      href: '/submit',
      meta: submissionCount === null ? '—' : `${submissionCount} submitted`,
    },
    { label: 'Inbox', href: '/inbox', meta: unreadCount > 0 ? `${unreadCount} unread` : 'up to date' },
    { label: 'Discover Events', href: '/' },
    ...(isAdmin ? [{ label: 'Admin Console', href: '/admin', meta: 'Editor' }] : []),
  ];

  return (
    <div className="account-page">
      {/* Identity block */}
      <header className="account-identity">
        <span className="account-eyebrow">— MEMBER PROFILE —</span>
        <div className="account-monogram">{initialsFor(email)}</div>
        <h1 className="account-display-name">{handle}</h1>
        <p className="account-tagline">{email}</p>
        <div className="account-badge-row">
          {isAdmin && <span className="account-badge filled">ADMIN</span>}
          <span className="account-badge">Member since {joined}</span>
        </div>
      </header>

      {/* Stat strip */}
      <section className="account-stat-strip">
        <div className="account-stat-cell">
          <span className="account-stat-num">
            {submissionCount === null ? '—' : submissionCount}
          </span>
          <span className="account-stat-label">Submissions</span>
        </div>
        <div className="account-stat-cell">
          <span className="account-stat-num">0</span>
          <span className="account-stat-label">Tickets</span>
        </div>
        <div className="account-stat-cell">
          <span className="account-stat-num">{savedCount}</span>
          <span className="account-stat-label">Saved</span>
        </div>
      </section>

      {/* Section label */}
      <div className="account-section-head">
        <span className="account-section-label">— NAVIGATION —</span>
      </div>

      {/* Numbered editorial menu rows */}
      <nav className="account-rows">
        {menuItems.map((item, idx) => (
          <a
            key={item.label}
            href={item.href ?? '#'}
            className="account-row"
          >
            <span className="account-row-num">
              {String(idx + 1).padStart(2, '0')}
            </span>
            <span className="account-row-label">{item.label}</span>
            {item.meta && <span className="account-row-meta">{item.meta}</span>}
            <span className="account-row-arrow">→</span>
          </a>
        ))}
      </nav>

      {/* Account meta */}
      <div className="account-section-head">
        <span className="account-section-label">— ACCOUNT DETAILS —</span>
      </div>
      <div className="account-meta-grid">
        <div className="account-meta-cell">
          <span className="account-meta-key">Email</span>
          <span className="account-meta-val">{email}</span>
        </div>
        <div className="account-meta-cell">
          <span className="account-meta-key">User ID</span>
          <span className="account-meta-val mono">{user.id.slice(0, 8)}…</span>
        </div>
        <div className="account-meta-cell">
          <span className="account-meta-key">Joined</span>
          <span className="account-meta-val">{joined}</span>
        </div>
        <div className="account-meta-cell">
          <span className="account-meta-key">Provider</span>
          <span className="account-meta-val">
            {(user.app_metadata?.provider as string) ?? 'email'}
          </span>
        </div>
      </div>

      {/* Change password */}
      <div className="account-section-head">
        <span className="account-section-label">— SECURITY —</span>
      </div>
      <div style={{ padding: '0 0 8px' }}>
        <button
          className="account-change-password"
          onClick={handleChangePassword}
          disabled={pwResetState === 'sending' || pwResetState === 'sent'}
        >
          {pwResetState === 'sending'
            ? 'Sending…'
            : pwResetState === 'sent'
            ? '✓ Reset link sent — check your email'
            : pwResetState === 'error'
            ? 'Something went wrong — try again'
            : 'Change Password'}
        </button>
      </div>

      {/* Sign out */}
      <button
        className="account-signout"
        onClick={async () => {
          await signOut();
        }}
      >
        Sign Out
      </button>

      <p className="account-foot-note">
        CULTIVE · 文化活 · v1.0 · Made in Hong Kong
      </p>
    </div>
  );
}
