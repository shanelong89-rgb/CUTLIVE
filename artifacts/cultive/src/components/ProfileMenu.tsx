import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/supabase';

function initialsFor(email?: string | null) {
  if (!email) return '·';
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/).filter(Boolean);
  const a = (parts[0]?.[0] ?? name[0] ?? '·').toUpperCase();
  const b = (parts[1]?.[0] ?? '').toUpperCase();
  return (a + b).slice(0, 2);
}

export function ProfileMenu() {
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  if (!user) return null;

  const email = user.email ?? '';
  const handle = email.split('@')[0];

  return (
    <div className="profile-menu-wrap" ref={wrapRef}>
      <button
        className="profile-menu-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={email}
      >
        <span className="profile-avatar">{initialsFor(email)}</span>
      </button>

      {open && (
        <div className="profile-menu-panel" role="menu">
          <div className="profile-menu-header">
            <span className="profile-avatar lg">{initialsFor(email)}</span>
            <div className="profile-menu-id">
              <span className="profile-menu-name">{handle}</span>
              <span className="profile-menu-email">{email}</span>
              {isAdmin && <span className="profile-menu-badge">ADMIN</span>}
            </div>
          </div>

          <div className="profile-menu-divider" />

          <a href="/account" className="profile-menu-item" onClick={() => setOpen(false)}>
            <span>My Account</span>
            <span className="profile-menu-arrow">→</span>
          </a>
          <a href="/tickets" className="profile-menu-item" onClick={() => setOpen(false)}>
            <span>My Tickets</span>
            <span className="profile-menu-arrow">→</span>
          </a>
          <a href="/inbox" className="profile-menu-item" onClick={() => setOpen(false)}>
            <span>Inbox</span>
            <span className="profile-menu-arrow">→</span>
          </a>
          {isAdmin && (
            <a href="/admin" className="profile-menu-item" onClick={() => setOpen(false)}>
              <span>Admin Console</span>
              <span className="profile-menu-arrow">→</span>
            </a>
          )}

          <div className="profile-menu-divider" />

          <button
            className="profile-menu-item signout"
            onClick={async () => {
              await signOut();
              setOpen(false);
            }}
          >
            <span>Sign Out</span>
            <span className="profile-menu-arrow">↗</span>
          </button>
        </div>
      )}
    </div>
  );
}
