import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { signOut, supabase } from '../lib/supabase';
import { useSavedEvents } from '../hooks/useSavedEvents';
import { useInbox } from '../contexts/InboxContext';

const SUB_CACHE_PREFIX = 'cultive:sub-count:';
const SAVED_VALIDATED_KEY = 'cultive:saved-count-validated';

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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return s;
  }
}

function readCache(key: string): number | null {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? Number(v) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, n: number) {
  try { localStorage.setItem(key, String(n)); } catch { /* ignore */ }
}

export function ProfileMenu() {
  const { user, isAdmin } = useAuth();
  const { ids } = useSavedEvents();
  const { unreadCount } = useInbox();
  const [open, setOpen] = useState(false);

  // ── Submission count ─────────────────────────────────────────────
  // Seed from cache so there's no "…" flash on repeat opens.
  const [submissionCount, setSubmissionCount] = useState<number | null>(() =>
    user ? readCache(`${SUB_CACHE_PREFIX}${user.id}`) : null
  );

  // ── Saved count ──────────────────────────────────────────────────
  // Raw ids.length can be stale (orphaned IDs from deleted events).
  // We keep a validated count that's refreshed when the panel opens.
  const [validatedSavedCount, setValidatedSavedCount] = useState<number | null>(
    () => readCache(SAVED_VALIDATED_KEY)
  );
  // Fall back to raw count while the validated count is loading.
  const displaySavedCount = validatedSavedCount ?? ids.length;

  // Track whether we've already fetched during this "open" session
  // so we don't re-fetch on every re-render while the panel is open.
  const fetchedForOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      fetchedForOpenRef.current = false;
      return;
    }
    if (!user || fetchedForOpenRef.current) return;
    fetchedForOpenRef.current = true;

    let active = true;

    // ── Submission count ──────────────────────────────────────────
    const subCacheKey = `${SUB_CACHE_PREFIX}${user.id}`;
    const cachedSub = readCache(subCacheKey);
    if (cachedSub !== null) setSubmissionCount(cachedSub);

    (async () => {
      const filters: string[] = [];
      if (user.id) filters.push(`user_id.eq.${user.id}`);
      if (user.email) filters.push(`submitter_email.eq.${user.email}`);
      const query = supabase.from('submissions').select('*', { count: 'exact', head: true });
      const { count } = filters.length ? await query.or(filters.join(',')) : await query;
      if (!active) return;
      const n = count ?? 0;
      setSubmissionCount(n);
      writeCache(subCacheKey, n);
    })();

    // ── Saved count validation (upcoming only) ───────────────────
    // Show cached validated count immediately (already seeded in state init).
    // Then cross-check which saved IDs still exist and are not yet past.
    if (ids.length === 0) {
      setValidatedSavedCount(0);
      writeCache(SAVED_VALIDATED_KEY, 0);
    } else {
      (async () => {
        const { data } = await supabase
          .from('events')
          .select('id, date, date_end')
          .in('id', ids);
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
        writeCache(SAVED_VALIDATED_KEY, n);
      })();
    }

    return () => { active = false; };
  }, [open, user, ids]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!user) return null;

  const email = user.email ?? '';
  const handle = email.split('@')[0];
  const joined = formatDate(user.created_at);

  return (
    <>
      <button
        className="profile-menu-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={email}
      >
        <span className="profile-avatar">{initialsFor(email)}</span>
      </button>

      {open && createPortal(
        <>
          <div
            className="profile-sidebar-backdrop"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="profile-sidebar" role="dialog" aria-label="Your profile">
            <header className="profile-sidebar-head">
              <span className="profile-sidebar-eyebrow">YOUR PROFILE</span>
              <button
                className="profile-sidebar-close"
                onClick={() => setOpen(false)}
                aria-label="Close profile"
              >
                ×
              </button>
            </header>

            <section className="profile-sidebar-identity">
              <span className="profile-avatar xl">{initialsFor(email)}</span>
              <h2 className="profile-sidebar-name">{handle}</h2>
              <p className="profile-sidebar-email">{email}</p>
              <div className="profile-sidebar-badges">
                {isAdmin && <span className="profile-pill admin">ADMIN</span>}
                <span className="profile-pill">Member</span>
              </div>
            </section>

            <section className="profile-sidebar-stats">
              <div className="profile-stat">
                <span className="profile-stat-num">
                  {submissionCount === null ? '…' : submissionCount}
                </span>
                <span className="profile-stat-label">Submissions</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-num">0</span>
                <span className="profile-stat-label">Tickets</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-num">{displaySavedCount}</span>
                <span className="profile-stat-label">Saved</span>
              </div>
            </section>

            <section className="profile-sidebar-meta">
              <div className="profile-meta-row">
                <span className="profile-meta-key">Joined</span>
                <span className="profile-meta-val">{joined}</span>
              </div>
              <div className="profile-meta-row">
                <span className="profile-meta-key">User ID</span>
                <span className="profile-meta-val mono">{user.id.slice(0, 8)}…</span>
              </div>
              <div className="profile-meta-row">
                <span className="profile-meta-key">Provider</span>
                <span className="profile-meta-val">
                  {user.app_metadata?.provider ?? 'email'}
                </span>
              </div>
            </section>

            <section className="profile-sidebar-nav">
              <span className="profile-sidebar-eyebrow soft">NAVIGATION</span>
              <a href="/account" className="profile-nav-row" onClick={() => setOpen(false)}>
                <span className="profile-nav-num">01</span>
                <span className="profile-nav-label">My Account</span>
                <span className="profile-nav-arrow">→</span>
              </a>
              <a href="/saved" className="profile-nav-row" onClick={() => setOpen(false)}>
                <span className="profile-nav-num">02</span>
                <span className="profile-nav-label">Saved Events</span>
                <span className="profile-nav-arrow">{displaySavedCount > 0 ? `${displaySavedCount} →` : '→'}</span>
              </a>
              <a href="/tickets" className="profile-nav-row" onClick={() => setOpen(false)}>
                <span className="profile-nav-num">03</span>
                <span className="profile-nav-label">My Tickets</span>
                <span className="profile-nav-arrow">→</span>
              </a>
              <a href="/submit" className="profile-nav-row" onClick={() => setOpen(false)}>
                <span className="profile-nav-num">04</span>
                <span className="profile-nav-label">Submit Event</span>
                <span className="profile-nav-arrow">→</span>
              </a>
              <a href="/inbox" className="profile-nav-row" onClick={() => setOpen(false)}>
                <span className="profile-nav-num">05</span>
                <span className="profile-nav-label">Inbox</span>
                <span className="profile-nav-arrow">
                  {unreadCount > 0 ? `${unreadCount > 9 ? '9+' : unreadCount} unread →` : '→'}
                </span>
              </a>
              {isAdmin && (
                <a href="/admin" className="profile-nav-row" onClick={() => setOpen(false)}>
                  <span className="profile-nav-num">06</span>
                  <span className="profile-nav-label">Admin Console</span>
                  <span className="profile-nav-arrow">→</span>
                </a>
              )}
            </section>

            <footer className="profile-sidebar-foot">
              <button
                className="profile-signout"
                onClick={async () => {
                  await signOut();
                  setOpen(false);
                }}
              >
                Sign Out
              </button>
              <p className="profile-sidebar-version">CULTIVE · 文化活 · v1.0</p>
            </footer>
          </aside>
        </>,
        document.body
      )}
    </>
  );
}
