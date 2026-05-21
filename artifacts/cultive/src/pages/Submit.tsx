import { useState, useRef } from 'react';
import { submitEvent, submitInstagramLink, supabase } from '../lib/supabase';
import { AVAILABLE_TAGS } from '../data/events';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from '../components/AuthModal';

// Convert "YYYY-MM-DD" from <input type="date"> into the human-readable
// format used elsewhere in the app (e.g. "Sat, Jun 7"). Parses as a local
// date to avoid timezone shifts.
function formatDate(iso: string): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Convert "HH:MM" 24h from <input type="time"> into "8:00 PM" style.
function formatTime(hhmm: string): string {
  if (!hhmm) return '';
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const h24 = Number(m[1]);
  const min = m[2];
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${min} ${period}`;
}

export function Submit() {
  const { user, loading: authLoading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // ── Shared thank-you state ──
  const [thankYouType, setThankYouType] = useState<null | 'instagram' | 'manual'>(null);

  // ── Instagram quick-submit ──
  const [igUrl, setIgUrl] = useState('');
  const [igSubmitting, setIgSubmitting] = useState(false);
  const [igError, setIgError] = useState('');

  const handleInstagramSubmit = async () => {
    if (!igUrl.trim()) return;
    setIgSubmitting(true);
    setIgError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await submitInstagramLink(igUrl.trim(), user?.id);
      setIgUrl('');
      setThankYouType('instagram');
    } catch (err: unknown) {
      setIgError('Could not save link. Please try again.');
      console.error(err);
    } finally {
      setIgSubmitting(false);
    }
  };

  // ── Manual form ──
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    venue: '',
    category: 'Music',
    price: '',
    description: '',
    ticket_url: '',
    submitter_name: '',
    submitter_email: '',
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitEvent({
        title: formData.title,
        date: formatDate(formData.date),
        time: formatTime(formData.time),
        venue: formData.venue,
        category: formData.category,
        price: formData.price,
        description: formData.description,
        image: '',
        is_exclusive: false,
        district: formData.venue.split(',')[0] || '',
        ticket_url: formData.ticket_url.trim() || null,
        tags: selectedTags,
        submitter_name: formData.submitter_name,
        submitter_email: formData.submitter_email,
      });
      setThankYouType('manual');
    } catch (error) {
      alert('Error submitting event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setThankYouType(null);
    setFormData({
      title: '',
      date: '',
      time: '',
      venue: '',
      category: 'Music',
      price: '',
      description: '',
      ticket_url: '',
      submitter_name: '',
      submitter_email: '',
    });
    setSelectedTags([]);
    setFiles([]);
    setIgUrl('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  // ── Auth gate ──
  if (authLoading) {
    return <div className="page"><div className="submit-auth-gate" style={{ justifyContent: 'center' }}><p style={{ color: 'var(--n-muted)', fontSize: '0.9rem' }}>Loading…</p></div></div>;
  }

  if (!user) {
    return (
      <div className="page">
        <div className="submit-auth-gate">
          <div className="submit-auth-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h2 className="submit-auth-title">Sign in to submit events</h2>
          <p className="submit-auth-body">
            CULTIVE relies on community contributors to keep the listings fresh.
            Create a free account to submit events and help the city discover what's on.
          </p>
          <div className="submit-auth-actions">
            <button className="submit-auth-btn-primary" onClick={() => setAuthModalOpen(true)}>
              Sign up free
            </button>
            <button className="submit-auth-btn-secondary" onClick={() => setAuthModalOpen(true)}>
              I already have an account
            </button>
          </div>
          <p className="submit-auth-note">Your submissions are tied to your account so we know where to send payment.</p>
        </div>
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    );
  }

  // ── Thank-you screen ──
  if (thankYouType) {
    const isIg = thankYouType === 'instagram';
    return (
      <div className="page">
        <div className="submit-thankyou">
          <div className="submit-thankyou-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="submit-thankyou-title">Submission received!</h2>
          <p className="submit-thankyou-body">
            {isIg
              ? "We've got your Instagram link. Our team will extract the event details and publish it once reviewed — usually within 24 hours."
              : "Thanks for the submission. Our team will review it and publish the event within 24 hours."}
          </p>
          <div className="submit-thankyou-actions">
            <button className="submit-auth-btn-primary" onClick={resetForm}>
              Submit another event
            </button>
            <a href="/" className="submit-auth-btn-secondary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '14px', border: '1px solid var(--n-border)', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--n-text)' }}>
              Back to events
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Submit an Event</h1>
        <p>Share what you know. Freelance editors get paid for approved submissions.</p>
      </div>

      {/* ── Instagram quick-submit ── */}
      <div className="ig-submit-section">
        <div className="ig-submit-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
          </svg>
          <span>Submit via Instagram link</span>
        </div>
        <p className="ig-submit-hint">Paste a post or reel URL — we'll extract the event details automatically.</p>
        <div className="ig-input-row">
          <input
            type="url"
            value={igUrl}
            onChange={(e) => setIgUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInstagramSubmit()}
            placeholder="https://www.instagram.com/p/..."
            className="ig-url-input"
          />
          <button
            type="button"
            onClick={handleInstagramSubmit}
            disabled={!igUrl.trim() || igSubmitting}
            className="ig-submit-btn"
          >
            {igSubmitting ? 'Sending…' : 'Submit'}
          </button>
        </div>
        {igError && <p className="ig-error">{igError}</p>}
      </div>

      <div className="submit-section-divider">
        <span>or fill out manually</span>
      </div>

      <form onSubmit={handleSubmit} className="submit-form">
        <div className="form-group">
          <label>Event Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Sunset Jazz at The Peak"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Category *</label>
            <select name="category" value={formData.category} onChange={handleChange}>
              <option value="Music">Music</option>
              <option value="Arts">Arts</option>
              <option value="Nightlife">Nightlife</option>
              <option value="Food">Food</option>
              <option value="Wellness">Wellness</option>
              <option value="Market">Market</option>
              <option value="Workshops">Workshops</option>
            </select>
          </div>

          <div className="form-group">
            <label>Price *</label>
            <input
              type="text"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="e.g. Free, $100"
              required
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label>Tags <span style={{ fontWeight: 400, color: 'var(--n-muted)' }}>(select all that apply)</span></label>
          <div className="tag-pill-row">
            {AVAILABLE_TAGS.map(tag => {
              const active = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`tag-pill-btn ${active ? 'active' : ''}`}
                  onClick={() =>
                    setSelectedTags(prev =>
                      active ? prev.filter(t => t !== tag.id) : [...prev, tag.id]
                    )
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
            <label>Date *</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Time *</label>
            <input type="time" name="time" value={formData.time} onChange={handleChange} required />
          </div>
        </div>

        <div className="form-group">
          <label>Venue/Location *</label>
          <input
            type="text"
            name="venue"
            value={formData.venue}
            onChange={handleChange}
            placeholder="e.g. The Peninsula Hotel, Tsim Sha Tsui"
            required
          />
        </div>

        <div className="form-group">
          <label>Ticket / RSVP link (optional)</label>
          <input
            type="url"
            name="ticket_url"
            value={formData.ticket_url}
            onChange={handleChange}
            placeholder="https://… leave blank if attendees should RSVP through CULTIVE"
          />
        </div>

        <div className="form-group">
          <label>Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Tell us what makes this event special..."
            required
          />
        </div>

        <div className="form-group">
          <label>Flyer or Photos</label>
          <div className="file-upload" onClick={() => fileInputRef.current?.click()}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p>{files.length > 0 ? `${files.length} file(s) selected` : 'Click to upload flyer or email forward'}</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.eml,.msg"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none'}}
          />
        </div>

        <div className="form-divider" />

        <div className="form-group">
          <label>Your Name *</label>
          <input
            type="text"
            name="submitter_name"
            value={formData.submitter_name}
            onChange={handleChange}
            placeholder="e.g. Jane Smith"
            required
          />
        </div>

        <div className="form-group">
          <label>Your Email *</label>
          <input
            type="email"
            name="submitter_email"
            value={formData.submitter_email}
            onChange={handleChange}
            placeholder="we'll send payment here once approved"
            required
          />
        </div>

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Event'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: 'var(--n-muted)' }}>
          All submissions are reviewed before publishing
        </p>
      </form>
    </div>
  );
}
