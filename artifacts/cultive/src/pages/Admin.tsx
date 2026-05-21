import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  supabase,
  signIn,
  signOut,
  isAdmin as checkIsAdmin,
  adminListEvents,
  adminListSubmissions,
  createEvent,
  updateEvent,
  deleteEvent,
  approveSubmission,
  rejectSubmission,
  type Event,
  type Submission,
} from '../lib/supabase';

const EMPTY_EVENT: Event = {
  id: '',
  title: '',
  date: '',
  time: '',
  venue: '',
  image: '',
  category: 'Music',
  price: '',
  description: '',
  is_exclusive: false,
  district: '',
  ticket_url: '',
};

export function Admin() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'events' | 'submissions'>('dashboard');
  const [events, setEvents] = useState<Event[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // ── Auth + admin gate ────────────────────────────────────
  const checkSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      setIsLoggedIn(false);
      setIsAdminUser(false);
      setAuthChecked(true);
      return;
    }
    setIsLoggedIn(true);
    const admin = await checkIsAdmin();
    setIsAdminUser(admin);
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    checkSession();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      checkSession();
    });
    return () => sub.subscription.unsubscribe();
  }, [checkSession]);

  // ── Load data once admin ─────────────────────────────────
  const loadData = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const [ev, subs] = await Promise.all([
        adminListEvents(),
        adminListSubmissions(),
      ]);
      setEvents(ev);
      setSubmissions(subs);
    } catch (e: any) {
      setDataError(e?.message ?? 'Failed to load admin data.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (isAdminUser) loadData();
  }, [isAdminUser, loadData]);

  // ── Login form ───────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError(null);
    try {
      await signIn(email, password);
      await checkSession();
    } catch (err: any) {
      setLoginError(err?.message ?? 'Sign-in failed.');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setIsLoggedIn(false);
    setIsAdminUser(false);
  };

  // ── Event CRUD ───────────────────────────────────────────
  const handleSaveEvent = async (event: Event) => {
    try {
      const { id, created_at, updated_at, ...rest } = event;
      if (id) {
        const updated = await updateEvent(id, rest);
        setEvents(prev => prev.map(e => (e.id === id ? updated : e)));
      } else {
        const created = await createEvent(rest);
        setEvents(prev => [created, ...prev]);
      }
      setEditingEvent(null);
    } catch (e: any) {
      alert(e?.message ?? 'Failed to save event.');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    try {
      await deleteEvent(id);
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (e: any) {
      alert(e?.message ?? 'Failed to delete event.');
    }
  };

  // ── Submission actions ───────────────────────────────────
  const handleApprove = async (sub: Submission) => {
    try {
      const { event, submission } = await approveSubmission(sub);
      setEvents(prev => [event, ...prev]);
      setSubmissions(prev => prev.map(s => (s.id === sub.id ? submission : s)));
    } catch (e: any) {
      alert(e?.message ?? 'Failed to approve.');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const updated = await rejectSubmission(id);
      setSubmissions(prev => prev.map(s => (s.id === id ? updated : s)));
    } catch (e: any) {
      alert(e?.message ?? 'Failed to reject.');
    }
  };

  // ── Render gates ─────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="admin-login">
        <div className="admin-login-box">
          <h1>CULTIVE Admin</h1>
          <p style={{ color: 'var(--n-muted)', fontSize: '0.85rem' }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="admin-login">
        <div className="admin-login-box">
          <h1>CULTIVE Admin</h1>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            {loginError && (
              <p style={{ color: '#b91c1c', fontSize: '0.85rem', marginBottom: 12 }}>
                {loginError}
              </p>
            )}
            <button type="submit" className="submit-btn" disabled={loginBusy}>
              {loginBusy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <Link to="/" className="back-link">← Back to site</Link>
        </div>
      </div>
    );
  }

  if (!isAdminUser) {
    return (
      <div className="admin-login">
        <div className="admin-login-box">
          <h1>Not an admin</h1>
          <p style={{ color: 'var(--n-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            You're signed in, but this account doesn't have admin access. Ask the
            project owner to grant you admin in Supabase:
          </p>
          <pre
            style={{
              background: '#f4f4f5',
              padding: 12,
              borderRadius: 4,
              fontSize: '0.75rem',
              overflowX: 'auto',
              marginTop: 12,
            }}
          >
{`update public.profiles
   set is_admin = true
 where email = 'your@email.com';`}
          </pre>
          <button onClick={handleLogout} className="submit-btn" style={{ marginTop: 16 }}>
            Sign Out
          </button>
          <Link to="/" className="back-link">← Back to site</Link>
        </div>
      </div>
    );
  }

  // ── Authenticated admin ──────────────────────────────────
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <span>CULTIVE</span>
          <small>Admin</small>
        </div>
        <nav className="admin-nav">
          <button
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={activeTab === 'events' ? 'active' : ''}
            onClick={() => setActiveTab('events')}
          >
            Events ({events.length})
          </button>
          <button
            className={activeTab === 'submissions' ? 'active' : ''}
            onClick={() => setActiveTab('submissions')}
          >
            Submissions ({submissions.filter(s => s.status === 'pending').length})
          </button>
        </nav>
        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-back-home">← Back to site</Link>
          <button className="admin-logout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {dataError && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 4, marginBottom: 16 }}>
            {dataError}
          </div>
        )}
        {loadingData && <p style={{ color: 'var(--n-muted)' }}>Loading…</p>}

        {activeTab === 'dashboard' && (
          <Dashboard events={events} submissions={submissions} onRefresh={loadData} />
        )}
        {activeTab === 'events' && (
          <EventsTab
            events={events}
            editingEvent={editingEvent}
            onEdit={setEditingEvent}
            onDelete={handleDeleteEvent}
            onSave={handleSaveEvent}
          />
        )}
        {activeTab === 'submissions' && (
          <SubmissionsTab
            submissions={submissions}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </main>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────
function Dashboard({
  events,
  submissions,
  onRefresh,
}: {
  events: Event[];
  submissions: Submission[];
  onRefresh: () => void;
}) {
  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;

  return (
    <div className="admin-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Dashboard</h2>
        <button className="submit-btn" onClick={onRefresh} style={{ width: 'auto', padding: '8px 16px' }}>
          Refresh
        </button>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-number">{events.length}</span>
          <span className="stat-label">Published Events</span>
        </div>
        <div className="stat-card pending">
          <span className="stat-number">{pendingCount}</span>
          <span className="stat-label">Pending Submissions</span>
        </div>
        <div className="stat-card approved">
          <span className="stat-number">{approvedCount}</span>
          <span className="stat-label">Approved (all time)</span>
        </div>
      </div>
    </div>
  );
}

// ── Events Tab ─────────────────────────────────────────────
function EventsTab({
  events,
  editingEvent,
  onEdit,
  onDelete,
  onSave,
}: {
  events: Event[];
  editingEvent: Event | null;
  onEdit: (e: Event | null) => void;
  onDelete: (id: string) => void;
  onSave: (e: Event) => void;
}) {
  const [formData, setFormData] = useState<Event>(editingEvent || EMPTY_EVENT);

  useEffect(() => {
    setFormData(editingEvent || EMPTY_EVENT);
  }, [editingEvent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (editingEvent) {
    return (
      <div className="admin-events">
        <h2>{editingEvent.id ? 'Edit Event' : 'New Event'}</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-row">
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option>Music</option>
                <option>Arts</option>
                <option>Nightlife</option>
                <option>Food</option>
                <option>Wellness</option>
                <option>Market</option>
                <option>Workshops</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="text"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                placeholder="e.g. Sat, Jun 7"
                required
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="text"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                placeholder="8:00 PM"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Venue</label>
            <input
              type="text"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Price</label>
              <input
                type="text"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="Free or $100"
              />
            </div>
            <div className="form-group">
              <label>District</label>
              <input
                type="text"
                value={formData.district || ''}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="Central, Wan Chai, etc."
              />
            </div>
          </div>
          <div className="form-group">
            <label>Image URL</label>
            <input
              type="text"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://…"
            />
            {formData.image ? (
              <div className="image-preview">
                <img
                  src={formData.image}
                  alt="Preview"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                  }}
                  onLoad={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'block';
                    (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'none';
                  }}
                />
                <div className="image-preview-fallback" style={{ display: 'none' }}>
                  Image failed to load
                </div>
              </div>
            ) : (
              <div className="image-preview-empty">No image yet — paste a URL above</div>
            )}
          </div>
          <div className="form-group">
            <label>Ticket / RSVP link (optional)</label>
            <input
              type="url"
              value={formData.ticket_url || ''}
              onChange={(e) => setFormData({ ...formData, ticket_url: e.target.value })}
              placeholder="https://… (external ticketing or RSVP page)"
            />
            <small style={{ color: 'var(--n-muted)' }}>
              If set, the event page shows a "Buy Tickets" button that opens this link instead of the in-app RSVP.
            </small>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={!!formData.is_exclusive}
                onChange={(e) => setFormData({ ...formData, is_exclusive: e.target.checked })}
              />
              Members Only (Exclusive)
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="submit-btn">
              {editingEvent.id ? 'Save Changes' : 'Create Event'}
            </button>
            <button type="button" className="cancel-btn" onClick={() => onEdit(null)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-events">
      <div className="admin-header">
        <h2>All Events</h2>
        <button className="submit-btn" onClick={() => onEdit(EMPTY_EVENT)}>
          + New Event
        </button>
      </div>
      {events.length === 0 ? (
        <div className="empty-state">
          <p>No events yet. Click "+ New Event" to create your first one.</p>
        </div>
      ) : (
        <div className="events-table">
          <div className="table-header">
            <span>Event</span>
            <span>Date</span>
            <span>Category</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {events.map(event => (
            <div key={event.id} className="table-row">
              <div className="event-info">
                <strong>{event.title}</strong>
                <small>{event.venue}</small>
              </div>
              <span>{event.date}</span>
              <span className="category-badge">{event.category}</span>
              <span className="status-badge published">Published</span>
              <div className="actions">
                <button onClick={() => onEdit(event)}>Edit</button>
                <button onClick={() => onDelete(event.id)} className="delete">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Submissions Tab ────────────────────────────────────────
function SubmissionsTab({
  submissions,
  onApprove,
  onReject,
}: {
  submissions: Submission[];
  onApprove: (s: Submission) => void;
  onReject: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const filtered = submissions.filter(s => s.status === filter);

  return (
    <div className="admin-submissions">
      <div className="admin-header">
        <h2>Submissions</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['pending', 'approved', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={filter === s ? 'submit-btn' : 'cancel-btn'}
              style={{ textTransform: 'capitalize', padding: '8px 16px', width: 'auto' }}
            >
              {s} ({submissions.filter(x => x.status === s).length})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No {filter} submissions.</p>
        </div>
      ) : (
        <div className="submissions-list">
          {filtered.map(sub => (
            <div key={sub.id} className="submission-card">
              <div className="submission-header">
                <h3>{sub.title}</h3>
                <span className="submission-date">
                  {new Date(sub.created_at).toLocaleDateString()}
                </span>
              </div>
              {sub.image ? (
                <div className="submission-image">
                  <img
                    src={sub.image}
                    alt={sub.title}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : null}
              <div className="submission-details">
                <p><strong>Date:</strong> {sub.date}{sub.time ? ` · ${sub.time}` : ''}</p>
                <p><strong>Venue:</strong> {sub.venue}</p>
                <p><strong>Category:</strong> {sub.category}</p>
                {sub.price && <p><strong>Price:</strong> {sub.price}</p>}
                {sub.description && (
                  <p style={{ marginTop: 8 }}>{sub.description}</p>
                )}
                <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--n-muted)' }}>
                  Submitted by <strong>{sub.submitter_name}</strong> ({sub.submitter_email})
                </p>
              </div>
              {filter === 'pending' && (
                <div className="submission-actions">
                  <button className="approve-btn" onClick={() => onApprove(sub)}>
                    Approve & Publish
                  </button>
                  <button className="reject-btn" onClick={() => onReject(sub.id)}>
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
