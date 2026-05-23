import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMySubmissions, type Submission } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'pending').replace('pending_scrape', 'pending').toLowerCase();
  const map: Record<string, { bg: string; color: string }> = {
    pending:  { bg: '#fef9c3', color: '#854d0e' },
    approved: { bg: '#dcfce7', color: '#166534' },
    rejected: { bg: '#fee2e2', color: '#991b1b' },
  };
  const style = map[s] ?? map.pending;
  return (
    <span style={{
      ...style,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 1,
      padding: '3px 8px',
      borderRadius: 4,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {s}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

export function MySubmissions() {
  const { user, loading: authLoading } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    setLoading(true);
    getMySubmissions()
      .then((subs) => { setSubmissions(subs); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user, authLoading]);

  return (
    <div className="page">
      <div className="page-header">
        <Link
          to="/account"
          style={{
            fontSize: 13, color: 'inherit', opacity: 0.55,
            textDecoration: 'none', display: 'inline-flex',
            alignItems: 'center', gap: 6, marginBottom: 12,
          }}
        >
          ← Account
        </Link>
        <h1>My Submissions</h1>
        <p>Events you've submitted for review</p>
      </div>

      {!user ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>
          </svg>
          <p>Sign in to see your submissions</p>
          <Link to="/account" className="inbox-cta-link">Go to account →</Link>
        </div>
      ) : loading ? (
        <div className="empty-state"><p>Loading…</p></div>
      ) : submissions.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <p>No submissions yet</p>
          <p style={{ fontSize: 13, opacity: 0.55, marginTop: 6, maxWidth: 260, textAlign: 'center', lineHeight: 1.5 }}>
            Share what you know — approved submissions earn $50 HKD.
          </p>
          <Link to="/submit" className="inbox-cta-link" style={{ marginTop: 20 }}>Submit an event →</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {submissions.map((sub) => (
            <div key={sub.id} className="message-card" style={{ cursor: 'default' }}>
              <div className="message-header">
                <h3 className="message-title" style={{ flex: 1 }}>
                  {/pending\s*scrape/i.test(sub.title ?? '') ? 'Pending review…' : sub.title}
                </h3>
                <StatusBadge status={sub.status} />
              </div>
              <p className="message-preview">
                {sub.date}{sub.venue ? ` · ${sub.venue}` : ''}
              </p>
              <p style={{ fontSize: 11, opacity: 0.45, marginTop: 6 }}>
                Submitted {formatDate(sub.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
