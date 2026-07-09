import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { signOut, supabase, getUserCredits, getOrCreateReferralCode, linkWhatsApp, getLinkedWhatsApp, type CreditTransaction } from '../lib/supabase';
import { useSavedEvents } from '../hooks/useSavedEvents';
import { useInbox } from '../contexts/InboxContext';
import { track } from '../lib/analytics';

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
  const [waPhone, setWaPhone] = useState('+852 ');
  const [waLinked, setWaLinked] = useState<string | null>(null);
  const [waState, setWaState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [waError, setWaError] = useState('');

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

    const balKey  = `cultive:credit-balance:${user.id}`;
    const txKey   = `cultive:credit-tx:${user.id}`;
    const codeKey = `cultive:referral-code:${user.id}`;

    // Seed from cache immediately so the UI renders with real numbers on return visits.
    try {
      const cachedBal  = localStorage.getItem(balKey);
      const cachedTx   = localStorage.getItem(txKey);
      const cachedCode = localStorage.getItem(codeKey);
      if (cachedBal  !== null) setCreditBalance(Number(cachedBal));
      if (cachedTx)             setCreditTx(JSON.parse(cachedTx));
      if (cachedCode)           setReferralCode(cachedCode);
    } catch { /* ignore */ }

    let active = true;
    (async () => {
      const [credits, code] = await Promise.all([getUserCredits(), getOrCreateReferralCode()]);
      if (!active) return;
      setCreditBalance(credits.balance);
      setCreditTx(credits.transactions);
      setReferralCode(code);
      try {
        localStorage.setItem(balKey,  String(credits.balance));
        localStorage.setItem(txKey,   JSON.stringify(credits.transactions));
        if (code) localStorage.setItem(codeKey, code);
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, [user]);

  // ── WhatsApp linking ─────────────────────────────────────────
  useEffect(() => {
    if (!user) { setWaLinked(null); return; }
    let active = true;
    (async () => {
      const phone = await getLinkedWhatsApp();
      if (active) setWaLinked(phone);
    })();
    return () => { active = false; };
  }, [user]);

  const handleLinkWhatsApp = async () => {
    if (waState === 'saving') return;
    setWaState('saving');
    setWaError('');
    const result = await linkWhatsApp(waPhone);
    if (result.ok) {
      setWaState('saved');
      setWaLinked(waPhone.replace(/[^\d+]/g, ''));
      track('whatsapp_linked');
    } else {
      setWaState('error');
      setWaError(result.error ?? 'Something went wrong — try again.');
    }
  };

  const inviteBase = referralCode ? `${window.location.origin}?ref=${referralCode}` : null;

  const inviteLinks = inviteBase ? {
    whatsapp: `${inviteBase}&utm_source=whatsapp&utm_medium=invite`,
    facebook: `${inviteBase}&utm_source=facebook&utm_medium=invite`,
    copy:     `${inviteBase}&utm_source=direct&utm_medium=invite`,
  } : null;

  const handleCopyInvite = () => {
    if (!inviteLinks) return;
    navigator.clipboard.writeText(inviteLinks.copy).then(() => {
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), 2000);
    });
    track('share_invite', { platform: 'copy' });
  };

  const shareViaWhatsApp = () => {
    if (!inviteLinks) return;
    const msg = encodeURIComponent(
      `been using CULTIVE to find events in HK — actually curated, no algorithm noise. sign up through my link and we both get HK$25 credit: ${inviteLinks.whatsapp}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener');
    track('share_invite', { platform: 'whatsapp' });
  };

  const shareViaFacebook = () => {
    if (!inviteLinks) return;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLinks.facebook)}`,
      '_blank',
      'noopener,width=600,height=400',
    );
    track('share_invite', { platform: 'facebook' });
  };

  const inviteTx = creditTx.filter(tx => tx.type === 'referral_bonus');
  const friendsJoined = inviteTx.length;
  const creditsFromInvites = inviteTx.reduce((sum, tx) => sum + tx.amount, 0);

  // ── Validated saved count (upcoming only) ────────────────────
  // Cross-checks local saved IDs against the events table, drops orphaned IDs
  // (deleted events), and excludes past events — count reflects upcoming only.
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
      const { data } = await supabase
        .from('events')
        .select('id, date, date_end')
        .in('id', savedIds);
      if (!active) return;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const n = (data ?? []).filter(e => {
        const raw = e.date_end || e.date;
        if (!raw) return true;
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
        if (!m) return true;
        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) >= today;
      }).length;
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

      {/* Invite a Friend — prominent, right after stats */}
      <div className="account-section-head">
        <span className="account-section-label">— INVITE A FRIEND —</span>
      </div>
      <div className="account-invite-panel">
        <p className="account-invite-desc">
          Share your link. When a friend signs up, you <strong>both earn HK$25</strong> — a thank you, not a pitch.
        </p>

        {friendsJoined > 0 && (
          <div className="account-invite-stats">
            <div className="account-invite-stat">
              <span className="account-invite-stat-num">{friendsJoined}</span>
              <span className="account-invite-stat-label">friend{friendsJoined !== 1 ? 's' : ''} joined</span>
            </div>
            <div className="account-invite-stat-divider" />
            <div className="account-invite-stat">
              <span className="account-invite-stat-num">HK${creditsFromInvites}</span>
              <span className="account-invite-stat-label">earned from invites</span>
            </div>
          </div>
        )}

        {inviteLinks ? (
          <>
            <button className="account-invite-wa-primary" onClick={shareViaWhatsApp}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Share on WhatsApp
            </button>
            <div className="account-invite-link-row">
              <span className="account-invite-link-text">{inviteLinks.copy}</span>
              <button className="account-invite-copy" onClick={handleCopyInvite}>
                {referralCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="account-invite-share-row">
              <button className="account-invite-share-btn account-invite-share-btn--fb" onClick={shareViaFacebook}>
                Facebook
              </button>
              <button className="account-invite-share-btn account-invite-share-btn--copy" onClick={handleCopyInvite}>
                {referralCopied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </>
        ) : (
          <p className="account-credit-empty">Generating your invite link…</p>
        )}
      </div>

      {/* WhatsApp linking */}
      <div className="account-section-head">
        <span className="account-section-label">— WHATSAPP —</span>
      </div>
      <div className="account-invite-panel">
        {waLinked ? (
          <>
            <p className="account-invite-desc">
              ✓ Linked to <strong>{waLinked}</strong>. We'll text you curated picks — reply anytime to chat.
            </p>
          </>
        ) : (
          <>
            <p className="account-invite-desc">
              Want event picks on WhatsApp? Link your number and we'll text you when something good comes up.
            </p>
            <div className="account-invite-link-row">
              <input
                type="tel"
                className="account-invite-link-text"
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', font: 'inherit' }}
                value={waPhone}
                onChange={(e) => { setWaPhone(e.target.value); setWaState('idle'); }}
                placeholder="+852 1234 5678"
              />
              <button
                className="account-invite-copy"
                onClick={handleLinkWhatsApp}
                disabled={waState === 'saving'}
              >
                {waState === 'saving' ? 'Linking…' : 'Link WhatsApp'}
              </button>
            </div>
            {waState === 'error' && (
              <p className="account-credit-empty" style={{ color: 'var(--error, #c0392b)' }}>{waError}</p>
            )}
            {waState === 'saved' && (
              <p className="account-credit-empty">
                We'll text you at {waPhone}. Reply "yes" on WhatsApp to confirm.
              </p>
            )}
          </>
        )}
      </div>

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
            No credits yet. Submit an event to earn HK$50, or invite a friend to earn HK$25 each.
          </p>
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
