import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mockEvents } from '../data/events';
import type { Event } from '../lib/supabase';

// Simple admin auth - in production use proper auth
const ADMIN_PASSWORD = 'cultive2025';

interface Submission {
  id: string;
  title: string;
  date: string;
  venue: string;
  category: string;
  submitter_name: string;
  submitter_email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'events' | 'submissions'>('dashboard');
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  useEffect(() => {
    // Load submissions from localStorage (mock)
    const saved = localStorage.getItem('cultive_submissions');
    if (saved) {
      setSubmissions(JSON.parse(saved));
    } else {
      // Create some mock submissions
      const mockSubmissions: Submission[] = [
        {
          id: 'sub-1',
          title: 'Live Jazz at The Murray',
          date: '2025-05-25',
          venue: 'The Murray, Central',
          category: 'Music',
          submitter_name: 'Sarah Chen',
          submitter_email: 'sarah@example.com',
          status: 'pending',
          created_at: new Date().toISOString()
        },
        {
          id: 'sub-2',
          title: 'Street Food Festival',
          date: '2025-05-26',
          venue: 'Kwun Tong',
          category: 'Food',
          submitter_name: 'John Lee',
          submitter_email: 'john@example.com',
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ];
      setSubmissions(mockSubmissions);
      localStorage.setItem('cultive_submissions', JSON.stringify(mockSubmissions));
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      localStorage.setItem('cultive_admin', 'true');
    } else {
      alert('Invalid password');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('cultive_admin');
  };

  const handleApprove = (id: string) => {
    const sub = submissions.find(s => s.id === id);
    if (sub) {
      const newEvent: Event = {
        id: 'event-' + Date.now(),
        title: sub.title,
        date: sub.date,
        time: '8:00 PM',
        venue: sub.venue,
        image: '',
        category: sub.category,
        price: 'Free',
        description: 'Submitted by ' + sub.submitter_name,
        isExclusive: false,
        district: sub.venue.split(',')[0] || 'Hong Kong'
      };
      setEvents([newEvent, ...events]);
      setSubmissions(submissions.map(s => s.id === id ? { ...s, status: 'approved' as const } : s));
      alert('Event approved and published!');
    }
  };

  const handleReject = (id: string) => {
    setSubmissions(submissions.map(s => s.id === id ? { ...s, status: 'rejected' as const } : s));
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm('Delete this event?')) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  const handleSaveEvent = (event: Event) => {
    if (editingEvent) {
      setEvents(events.map(e => e.id === event.id ? event : e));
    } else {
      setEvents([{ ...event, id: 'event-' + Date.now() }, ...events]);
    }
    setEditingEvent(null);
  };

  if (!isLoggedIn) {
    return (
      <div className="admin-login">
        <div className="admin-login-box">
          <h1>CULTIVE Admin</h1>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
              />
            </div>
            <button type="submit" className="submit-btn">Login</button>
          </form>
          <Link to="/" className="back-link">← Back to site</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
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
        <button className="admin-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {activeTab === 'dashboard' && (
          <Dashboard events={events} submissions={submissions} />
        )}
        {activeTab === 'events' && (
          <EventsTab
            events={events}
            onEdit={setEditingEvent}
            onDelete={handleDeleteEvent}
            onSave={handleSaveEvent}
            editingEvent={editingEvent}
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

// Dashboard Component
function Dashboard({ events, submissions }: { events: Event[]; submissions: Submission[] }) {
  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;

  return (
    <div className="admin-dashboard">
      <h2>Dashboard</h2>
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
          <span className="stat-label">Approved This Week</span>
        </div>
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <Link to="/submit" className="action-btn">
            + Add New Event
          </Link>
        </div>
      </div>
    </div>
  );
}

// Events Tab Component
function EventsTab({
  events,
  onEdit,
  onDelete,
  onSave,
  editingEvent
}: {
  events: Event[];
  onEdit: (e: Event) => void;
  onDelete: (id: string) => void;
  onSave: (e: Event) => void;
  editingEvent: Event | null;
}) {
  const [formData, setFormData] = useState<Event>(editingEvent || {
    id: '',
    title: '',
    date: '',
    time: '',
    venue: '',
    image: '',
    category: 'Music',
    price: '',
    description: '',
    isExclusive: false,
    district: ''
  });

  useEffect(() => {
    if (editingEvent) {
      setFormData(editingEvent);
    }
  }, [editingEvent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData({
      id: '',
      title: '',
      date: '',
      time: '',
      venue: '',
      image: '',
      category: 'Music',
      price: '',
      description: '',
      isExclusive: false,
      district: ''
    });
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
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
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
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="Central, Wan Chai, etc."
              />
            </div>
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
                checked={formData.isExclusive}
                onChange={(e) => setFormData({ ...formData, isExclusive: e.target.checked })}
              />
              Members Only (Exclusive)
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="submit-btn">
              {editingEvent.id ? 'Save Changes' : 'Create Event'}
            </button>
            <button type="button" className="cancel-btn" onClick={() => onEdit(null as any)}>
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
        <button className="submit-btn" onClick={() => onEdit({
          id: '',
          title: '',
          date: '',
          time: '',
          venue: '',
          image: '',
          category: 'Music',
          price: '',
          description: '',
          isExclusive: false,
          district: ''
        })}>
          + New Event
        </button>
      </div>
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
              <button onClick={() => onDelete(event.id)} className="delete">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Submissions Tab Component
function SubmissionsTab({
  submissions,
  onApprove,
  onReject
}: {
  submissions: Submission[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const pending = submissions.filter(s => s.status === 'pending');

  return (
    <div className="admin-submissions">
      <h2>Submissions Queue</h2>
      {pending.length === 0 ? (
        <div className="empty-state">
          <p>No pending submissions</p>
        </div>
      ) : (
        <div className="submissions-list">
          {pending.map(sub => (
            <div key={sub.id} className="submission-card">
              <div className="submission-header">
                <h3>{sub.title}</h3>
                <span className="submission-date">{new Date(sub.created_at).toLocaleDateString()}</span>
              </div>
              <div className="submission-details">
                <p><strong>Date:</strong> {sub.date}</p>
                <p><strong>Venue:</strong> {sub.venue}</p>
                <p><strong>Category:</strong> {sub.category}</p>
                <p><strong>Submitted by:</strong> {sub.submitter_name} ({sub.submitter_email})</p>
                {/* Show flyer images embedded in description */}
                {(() => {
                  const desc = (sub as any).description || '';
                  const imageMatches = desc.match(/!\[[^\]]*\]\(([^)]+)\)/g) || [];
                  if (imageMatches.length === 0) return null;
                  return (
                    <div style={{ marginTop: '12px' }}>
                      <p><strong>Flyer/Images:</strong></p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {imageMatches.map((match: string, idx: number) => {
                          const urlMatch = match.match(/!\[[^\]]*\]\(([^)]+)\)/);
                          const url = urlMatch ? urlMatch[1] : '';
                          return (
                            <img 
                              key={idx}
                              src={url}
                              alt={`Flyer ${idx + 1}`}
                              style={{ 
                                width: '100px', 
                                height: '130px', 
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb',
                                cursor: 'pointer'
                              }}
                              onClick={() => window.open(url, '_blank')}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="submission-actions">
                <button className="approve-btn" onClick={() => onApprove(sub.id)}>
                  ✓ Approve ($50 HKD)
                </button>
                <button className="reject-btn" onClick={() => onReject(sub.id)}>
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
