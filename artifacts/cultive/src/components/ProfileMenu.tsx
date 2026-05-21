import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { signOut, supabase } from '../lib/supabase';
import { useSavedEvents } from '../hooks/useSavedEvents';

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

export function ProfileMenu() {
  const { user, isAdmin } = useAuth();
  const { count: savedCount } = useSavedEvents();
  const [open, setOpen] = useState(false);
  const [submissionCount, setSubmissionCount] = useState<number | null>(null);

  // Load the user's submission count when the panel opens
  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    (async () => {
      // Match by user_id (Instagram submissions) OR submitter_email (manual submissions)
      const filters: string[] = [];
      if (user.id) filters.push(`user_id.eq.${user.id}`);
      if (user.email) filters.push(`submitter_email.eq.${user.email}`);
      const query = supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true });
      const { count } = filters.length
        ? await query.or(filters.join(','))
        : await query;
      if (active) setSubmissionCount(count ?? 0);
    })();
    return () => {
      active = false;
    };
  }, [open, user]);

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
                <span className="profile-stat-num">{savedCount}</span>
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
                <span className="profile-nav-arrow">{savedCount > 0 ? `${savedCount} →` : '→'}</span>
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
                <span className="profile-nav-arrow">→</span>
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
