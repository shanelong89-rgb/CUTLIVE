import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { signOut, supabase, getUserCredits, getOrCreateReferralCode, type CreditTransaction } from '../lib/supabase';
import { useSavedEvents } from '../hooks/useSavedEvents';
import { useInbox } from '../contexts/InboxContext';

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
  const { ids: savedIds } = useSavedEvents();
  const { unreadCount } = useInbox();

  // DB-validated saved count — seeds from cache so the number is instant
  // on return visits, then refreshes against the events table to drop any
  // orphaned IDs (events that were deleted after being saved).
  const SAVED_VALIDATED_KEY = 'cultive:saved-count-validated';
  const [validatedSavedCount, setValidatedSavedCount] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem(SAVED_VALIDATED_KEY);
      return v !== null ? Number(v) : null;
    } catch { return null; }
  });
  const displaySavedCount = validatedSavedCount ?? savedIds.length;
  const [submissionCount, setSubmissionCount] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      // Will be overwritten once we know the user ID, but avoids a flash on
      // repeated visits by reading the last-known count for any user.
      return null;
    } catch { return null; }
  });
  const [pwResetState, setPwResetState] = useState<'idle' | 'sending' | 'sent' | 'error' | 'rate-limited'>('idle');
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [creditTx, setCreditTx] = useState<CreditTransaction[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);

  const handleChangePassword = async () => {
    if (!user?.email || pwResetState === 'sending' || pwResetState === 'sent') return;
    setPwResetState('sending');
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (!error) {
      setPwResetState('sent');
    } else if (error.status === 429 || error.message?.toLowerCase().includes('rate limit')) {
      setPwResetState('rate-limited');
    } else {
      setPwResetState('error');
    }
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

  // ── Credits & referral code ──────────────────────────────────
  useEffect(() => {
    if (!user) { setCreditBalance(null); setCreditTx([]); setReferralCode(null); return; }
    let active = true;
    (async () => {
      const [credits, code] = await Promise.all([getUserCredits(), getOrCreateReferralCode()]);
      if (!active) return;
      setCreditBalance(credits.balance);
      setCreditTx(credits.transactions);
      setReferralCode(code);
    })();
    return () => { active = false; };
  }, [user]);

  const inviteLink = referralCode ? `${window.location.origin}?ref=${referralCode}` : null;

  const handleCopyInvite = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), 2000);
    });
  };

  // ── Validated saved count ────────────────────────────────────
  // Cross-checks local saved IDs against the events table so orphaned IDs
  // (deleted events still sitting in saved_events) don't inflate the count.
  useEffect(() => {
    if (!user) { setValidatedSavedCount(null); return; }
    let active = true;
    (async () => {
      if (savedIds.length === 0) {
        if (!active) return;
        setValidatedSavedCount(0);
        try { localStorage.setItem(SAVED_VALIDATED_KEY, '0'); } catch { /* ignore */ }
        return;
      }
      const { count } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .in('id', savedIds);
      if (!active) return;
      const n = count ?? 0;
      setValidatedSavedCount(n);
      try { localStorage.setItem(SAVED_VALIDATED_KEY, String(n)); } catch { /* ignore */ }
    })();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, savedIds.length]);

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
    { label: 'Saved Events', href: '/saved', meta: `${displaySavedCount} saved` },
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
          <span className="account-stat-num">{displaySavedCount}</span>
          <span className="account-stat-label">Saved</span>
        </div>
        <div className="account-stat-cell account-stat-cell--credit">
          <span className="account-stat-num account-stat-num--credit">
            {creditBalance === null ? '—' : `HK$${creditBalance}`}
          </span>
          <span className="account-stat-label">Credits</span>
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

      {/* Credits & Rewards */}
      <div className="account-section-head">
        <span className="account-section-label">— CREDITS & REWARDS —</span>
      </div>
      <div className="account-credit-panel">
        <div className="account-credit-balance">
          <span className="account-credit-balance-label">Available Balance</span>
          <span className="account-credit-balance-amount">
            HK${creditBalance ?? 0}
          </span>
          <span className="account-credit-balance-note">
            Earn HK$50 per approved submission · HK$25 per invite
          </span>
        </div>
        {creditTx.length > 0 ? (
          <ul className="account-credit-tx-list">
            {creditTx.map(tx => (
              <li key={tx.id} className="account-credit-tx">
                <span className="account-credit-tx-desc">{tx.description ?? tx.type}</span>
                <span className={`account-credit-tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                  {tx.amount >= 0 ? '+' : ''}HK${tx.amount}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="account-credit-empty">
            No credits yet — submit an event or invite a friend to earn your first HK$50 or HK$25.
          </p>
        )}
      </div>

      {/* Invite a Friend */}
      <div className="account-section-head">
        <span className="account-section-label">— INVITE A FRIEND —</span>
      </div>
      <div className="account-invite-panel">
        <p className="account-invite-desc">
          Share your personal link. When a friend signs up, you both get a head start — you earn <strong>HK$25</strong> in credits the moment they join.
        </p>
        {inviteLink ? (
          <div className="account-invite-link-row">
            <span className="account-invite-link-text">{inviteLink}</span>
            <button className="account-invite-copy" onClick={handleCopyInvite}>
              {referralCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        ) : (
          <p className="account-credit-empty">Generating your invite link…</p>
        )}
      </div>

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
            : pwResetState === 'rate-limited'
            ? 'Too many attempts — wait a few minutes'
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
