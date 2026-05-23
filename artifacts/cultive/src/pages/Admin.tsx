import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AVAILABLE_TAGS, CATEGORY_TAG_MAP, TAG_CATEGORY_MAP } from '../data/events';
import { RichTextEditor } from '../components/RichTextEditor';

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
  submitInstagramLink,
  sendSubmissionPushNotification,
  type Event,
  type Submission,
} from '../lib/supabase';

function displayDateRange(date?: string, dateEnd?: string | null): string {
  if (!date) return '';
  const parseYMD = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  };
  const start = parseYMD(date);
  if (!dateEnd) {
    if (start) return start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return date;
  }
  const end = parseYMD(dateEnd);
  if (!start || !end) {
    if (start) return start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return date;
  }
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()} – ${end.getDate()}`;
  }
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

const EMPTY_EVENT: Event = {
  id: '',
  title: '',
  date: '',
  date_end: '',
  time: '',
  venue: '',
  image: '',
  category: 'Music',
  price: '',
  description: '',
  is_exclusive: false,
  rsvp_enabled: false,
  district: '',
  ticket_url: '',
  source_url: '',
  submitted_by: '',
  tags: [],
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
      if (sub.submitter_email) {
        sendSubmissionPushNotification({
          submitterEmail: sub.submitter_email,
          submissionTitle: sub.title,
          status: 'approved',
          publishedEventId: event.id,
        });
      }
    } catch (e: any) {
      alert(e?.message ?? 'Failed to approve.');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const updated = await rejectSubmission(id);
      setSubmissions(prev => prev.map(s => (s.id === id ? updated : s)));
      if (updated.submitter_email) {
        sendSubmissionPushNotification({
          submitterEmail: updated.submitter_email,
          submissionTitle: updated.title,
          status: 'rejected',
        });
      }
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
            Submissions ({submissions.filter(s => s.status === 'pending' || s.status === 'pending_scrape').length})
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
            onEventsPatched={(updated) =>
              setEvents(prev => prev.map(e => {
                const patch = updated.find(u => u.id === e.id);
                return patch ?? e;
              }))
            }
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
  const pendingCount = submissions.filter(s => s.status === 'pending' || s.status === 'pending_scrape').length;
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
  onEventsPatched,
}: {
  events: Event[];
  editingEvent: Event | null;
  onEdit: (e: Event | null) => void;
  onDelete: (id: string) => void;
  onSave: (e: Event) => void;
  onEventsPatched: (updated: Event[]) => void;
}) {
  const [formData, setFormData] = useState<Event>(editingEvent || EMPTY_EVENT);
  const [igUrl, setIgUrl] = useState('');
  const [igBusy, setIgBusy] = useState(false);
  const [igMsg, setIgMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [fixBusy, setFixBusy] = useState(false);
  const [fixMsg, setFixMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const eventsWithMissingTags = events.filter(e => !e.tags || e.tags.length === 0);

  const handleFixMissingTags = async () => {
    if (eventsWithMissingTags.length === 0) return;
    setFixBusy(true);
    setFixMsg(null);
    const updated: Event[] = [];
    const errors: string[] = [];
    let skipped = 0;
    for (const event of eventsWithMissingTags) {
      const primaryTag = CATEGORY_TAG_MAP[event.category ?? ''];
      if (!primaryTag) {
        skipped++;
        continue;
      }
      try {
        const patched = await updateEvent(event.id, { tags: [primaryTag] });
        updated.push(patched);
      } catch (e: any) {
        errors.push(e?.message ?? `Failed for event ${event.id}`);
      }
    }
    setFixBusy(false);
    if (updated.length > 0) onEventsPatched(updated);
    const parts: string[] = [];
    if (updated.length > 0) parts.push(`Fixed ${updated.length} event${updated.length !== 1 ? 's' : ''}`);
    if (skipped > 0) parts.push(`${skipped} skipped (no mappable tag for category)`);
    if (errors.length > 0) parts.push(`${errors.length} failed`);
    setFixMsg({
      type: errors.length > 0 ? 'err' : 'ok',
      text: parts.join(', ') + '.',
    });
  };

  useEffect(() => {
    if (!editingEvent) { setFormData(EMPTY_EVENT); return; }
    let tags: string[] = editingEvent.tags ?? [];
    let category: string = editingEvent.category ?? 'Other';

    if (tags.length > 0) {
      // Tags exist — check if category matches; if not, derive category from tags
      const primaryTagForCategory = CATEGORY_TAG_MAP[category];
      const categoryTagPresent = primaryTagForCategory && tags.includes(primaryTagForCategory);
      if (!categoryTagPresent) {
        const firstMapped = tags.find(t => TAG_CATEGORY_MAP[t]);
        if (firstMapped) category = TAG_CATEGORY_MAP[firstMapped];
      }
    } else if (category) {
      // Tags empty — derive initial tag from category so pills are pre-selected
      const primaryTag = CATEGORY_TAG_MAP[category];
      if (primaryTag) tags = [primaryTag];
    }

    setFormData({ ...editingEvent, tags, category });
  }, [editingEvent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleIgAdd = async () => {
    if (!igUrl.trim()) return;
    setIgBusy(true);
    setIgMsg(null);
    try {
      await submitInstagramLink(igUrl.trim());
      setIgUrl('');
      setIgMsg({ type: 'ok', text: '✅ Queued in Submissions → Pending.' });
    } catch (e: unknown) {
      setIgMsg({ type: 'err', text: (e as Error)?.message ?? 'Failed to queue link.' });
    } finally {
      setIgBusy(false);
    }
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
                onChange={(e) => {
                  const newCategory = e.target.value;
                  const primaryTag = CATEGORY_TAG_MAP[newCategory];
                  setFormData(f => {
                    const currentTags = f.tags ?? [];
                    const newTags = primaryTag && !currentTags.includes(primaryTag)
                      ? [primaryTag, ...currentTags]
                      : currentTags;
                    return { ...f, category: newCategory, tags: newTags };
                  });
                }}
              >
                <option>Music</option>
                <option>Arts</option>
                <option>Nightlife</option>
                <option>Food</option>
                <option>Wellness</option>
                <option>Market</option>
                <option>Workshops</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Tags <span style={{ fontWeight: 400, fontSize: '0.78rem', color: '#888', marginLeft: 6 }}>Category and Tags should agree</span></label>
            <div className="tag-pill-row">
              {AVAILABLE_TAGS.map(tag => {
                const active = (formData.tags ?? []).includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={`tag-pill-btn ${active ? 'active' : ''}`}
                    onClick={() =>
                      setFormData(f => {
                        const currentTags = f.tags ?? [];
                        const newTags = active
                          ? currentTags.filter(t => t !== tag.id)
                          : [...currentTags, tag.id];
                        // Re-derive category from the resulting tags:
                        // triggers when the current category's primary tag was removed,
                        // OR the category is 'Other' (no primary tag) and a mapped tag was added
                        const primaryTagForCategory = CATEGORY_TAG_MAP[f.category ?? ''];
                        const categoryStillRepresented = primaryTagForCategory
                          ? newTags.includes(primaryTagForCategory)
                          : false;
                        let newCategory = f.category;
                        if (!categoryStillRepresented) {
                          const firstMatch = newTags.find(t => TAG_CATEGORY_MAP[t]);
                          if (firstMatch) newCategory = TAG_CATEGORY_MAP[firstMatch];
                        }
                        return { ...f, tags: newTags, category: newCategory };
                      })
                    }
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>End Date <span style={{ fontWeight: 'normal', opacity: 0.6 }}>(optional)</span></label>
              <input
                type="date"
                value={formData.date_end ?? ''}
                onChange={(e) => setFormData({ ...formData, date_end: e.target.value })}
                min={formData.date || undefined}
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
            <label>Source / Instagram link (optional)</label>
            <input
              type="text"
              value={formData.source_url || ''}
              onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
              placeholder="instagram.com/p/… or full URL"
            />
            <small style={{ color: 'var(--n-muted)' }}>
              Shows a "View on Instagram" (or "View at source") button on the event page.
            </small>
          </div>
          <div className="form-group">
            <label>Description</label>
            <RichTextEditor
              value={formData.description}
              onChange={(html) => setFormData({ ...formData, description: html })}
              placeholder="Describe the event — bold, italic, links and lists supported…"
            />
          </div>
          <div className="form-group">
            <label>Curated by (optional)</label>
            <input
              type="text"
              value={formData.submitted_by || ''}
              onChange={(e) => setFormData({ ...formData, submitted_by: e.target.value })}
              placeholder="e.g. Shane Long"
            />
            <small style={{ color: 'var(--n-muted)' }}>
              Shows as "Curated by [name]" on the event page. Auto-filled when approving a submission.
            </small>
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
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={!!formData.rsvp_enabled}
                onChange={(e) => setFormData({ ...formData, rsvp_enabled: e.target.checked })}
              />
              Enable RSVP Free button (partnered event)
            </label>
            <small style={{ color: 'var(--n-muted)', marginTop: 4, display: 'block' }}>
              Only enable once in-app RSVP is set up for this event.
            </small>
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

      {/* Fix missing tags */}
      {(eventsWithMissingTags.length > 0 || fixMsg) && (
        <div className="admin-ig-add" style={{ marginBottom: 12 }}>
          {eventsWithMissingTags.length > 0 && (
            <>
              <span className="admin-ig-add-label">
                {eventsWithMissingTags.length} event{eventsWithMissingTags.length !== 1 ? 's' : ''} missing tags
              </span>
              <div className="admin-ig-add-row">
                <button
                  type="button"
                  className="admin-ig-add-btn"
                  disabled={fixBusy}
                  onClick={handleFixMissingTags}
                >
                  {fixBusy ? 'Fixing…' : 'Fix missing tags'}
                </button>
              </div>
            </>
          )}
          {fixMsg && (
            <p style={{ marginTop: 6, fontSize: '0.82rem', color: fixMsg.type === 'ok' ? '#16a34a' : '#dc2626' }}>
              {fixMsg.text}
            </p>
          )}
        </div>
      )}

      {/* Instagram quick-add */}
      <div className="admin-ig-add">
        <span className="admin-ig-add-label">Add via Instagram link</span>
        <div className="admin-ig-add-row">
          <input
            type="url"
            value={igUrl}
            onChange={e => setIgUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleIgAdd()}
            placeholder="https://www.instagram.com/p/..."
            className="admin-ig-add-input"
          />
          <button
            type="button"
            className="admin-ig-add-btn"
            disabled={!igUrl.trim() || igBusy}
            onClick={handleIgAdd}
          >
            {igBusy ? 'Queuing…' : 'Queue'}
          </button>
        </div>
        {igMsg && (
          <p style={{ marginTop: 6, fontSize: '0.82rem', color: igMsg.type === 'ok' ? '#16a34a' : '#dc2626' }}>
            {igMsg.text}
          </p>
        )}
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
              <span>{displayDateRange(event.date, event.date_end)}</span>
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
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Treat both 'pending' and 'pending_scrape' as pending
  const isPending = (s: Submission) => s.status === 'pending' || s.status === 'pending_scrape';
  const pendingSubs   = submissions.filter(isPending);
  const approvedSubs  = submissions.filter(s => s.status === 'approved');
  const rejectedSubs  = submissions.filter(s => s.status === 'rejected');
  const filtered = filter === 'pending' ? pendingSubs : filter === 'approved' ? approvedSubs : rejectedSubs;

  const tabCounts = { pending: pendingSubs.length, approved: approvedSubs.length, rejected: rejectedSubs.length };

  return (
    <>
      {lightboxUrl && (
        <div
          className="submission-lightbox-overlay"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="submission-lightbox-close"
            onClick={() => setLightboxUrl(null)}
            aria-label="Close image"
          >
            ✕
          </button>
          <img
            src={lightboxUrl}
            alt="Submission photo"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
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
              {s} ({tabCounts[s]})
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
              {(() => {
                const isPendingScrape = sub.status === 'pending_scrape';
                const scraped = (sub.scraped_data ?? {}) as Record<string, unknown>;
                const hasScrapedData = Object.keys(scraped).length > 0;
                const str = (...keys: string[]) => {
                  for (const k of keys) {
                    const v = scraped[k];
                    if (typeof v === 'string' && v.trim()) return v as string;
                  }
                  return undefined;
                };
                const arr = (...keys: string[]): string[] => {
                  for (const k of keys) {
                    const v = scraped[k];
                    if (Array.isArray(v) && v.length > 0) return v as string[];
                  }
                  return [];
                };

                const dispTitle       = sub.title       || str('extracted_title', 'title')           || 'Pending scrape…';
                const dispDate        = sub.date        || str('extracted_date', 'date');
                const dispDateEnd     = sub.date_end    || str('extracted_date_end', 'date_end');
                const dispTime        = sub.time        || str('extracted_time', 'time');
                const dispVenue       = sub.venue       || str('extracted_venue', 'venue', 'location');
                const dispPrice       = sub.price       || str('extracted_price', 'price');
                const dispDescription = sub.description || str('extracted_description', 'description', 'caption', 'body');
                const dispImage       = sub.image       || str('image', 'image_url', 'extracted_image', 'photo', 'photo_url', 'thumbnail', 'cover_image');
                const dispCategory    = sub.category    || str('extracted_category', 'category');
                const dispDistrict    = sub.district    || str('extracted_district', 'district', 'area');
                const dispTicketUrl   = sub.ticket_url  || str('ticket_url', 'extracted_ticket_url', 'link');
                const dispTags        = (sub.tags && sub.tags.length > 0) ? sub.tags : arr('tags', 'extracted_tags');

                return (
                  <>
                    <div className="submission-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0 }}>{dispTitle}</h3>
                        <span className={`sub-type-badge ${sub.submission_type === 'instagram' ? 'ig' : 'manual'}`}>
                          {sub.submission_type === 'instagram' ? '📱 Instagram' : '✏️ Manual'}
                        </span>
                        {isPendingScrape && (
                          <span className="sub-scrape-badge">⏳ Needs scrape</span>
                        )}
                        {hasScrapedData && !isPendingScrape && (
                          <span className="sub-scraped-badge">✅ Scraped</span>
                        )}
                      </div>
                      <span className="submission-date">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {dispImage ? (
                      <div
                        className="submission-image"
                        onClick={() => setLightboxUrl(dispImage!)}
                        title="Click to view full size"
                      >
                        <img
                          src={dispImage}
                          alt={dispTitle}
                          loading="lazy"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none'; }}
                        />
                      </div>
                    ) : null}

                    <div className="submission-details">
                      {dispDate && <p><strong>Date:</strong> {displayDateRange(dispDate, dispDateEnd)}{dispTime ? ` · ${dispTime}` : ''}</p>}
                      {dispVenue && <p><strong>Venue:</strong> {dispVenue}</p>}
                      {dispCategory && <p><strong>Category:</strong> {dispCategory}</p>}
                      {dispDistrict && <p><strong>District:</strong> {dispDistrict}</p>}
                      {dispPrice && <p><strong>Price:</strong> {dispPrice}</p>}
                      {dispTags.length > 0 && (
                        <p><strong>Tags:</strong> {dispTags.join(', ')}</p>
                      )}
                      {dispDescription && <p style={{ marginTop: 8 }}>{dispDescription}</p>}
                      {dispTicketUrl && (
                        <p style={{ marginTop: 4 }}>
                          <a href={dispTicketUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--n-accent)', fontSize: '0.88rem' }}>
                            ↗ Ticket / Event link
                          </a>
                        </p>
                      )}

                      {sub.instagram_url && (
                        <a href={sub.instagram_url} target="_blank" rel="noopener noreferrer" className="sub-ig-link">
                          ↗ View Instagram post
                        </a>
                      )}

                      {(sub.submitter_name || sub.submitter_email) && (
                        <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--n-muted)' }}>
                          Submitted by{sub.submitter_name ? <strong> {sub.submitter_name}</strong> : null}
                          {sub.submitter_email ? ` (${sub.submitter_email})` : ''}
                        </p>
                      )}

                      {/* Raw scraped data — collapsed, for debugging */}
                      {hasScrapedData && (
                        <details style={{ marginTop: 10 }}>
                          <summary style={{ fontSize: '0.8rem', color: 'var(--n-muted)', cursor: 'pointer' }}>
                            Raw scraped data
                          </summary>
                          <pre style={{ marginTop: 6, padding: '10px 12px', background: 'var(--n-bg-alt)', borderRadius: 4, fontSize: '0.75rem', overflowX: 'auto', whiteSpace: 'pre-wrap', color: 'var(--n-secondary)' }}>
                            {JSON.stringify(scraped, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>

                    {filter === 'pending' && (
                      <div className="submission-actions">
                        {isPendingScrape && !hasScrapedData ? (
                          <>
                            <span style={{ fontSize: '0.82rem', color: 'var(--n-muted)', fontStyle: 'italic', flex: 1 }}>
                              No scraped data yet — open the Instagram link, fill in details manually via Edit, then approve.
                            </span>
                            <button className="reject-btn" onClick={() => onReject(sub.id)}>
                              Reject
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="approve-btn" onClick={() => onApprove(sub)}>
                              Approve & Publish
                            </button>
                            <button className="reject-btn" onClick={() => onReject(sub.id)}>
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
