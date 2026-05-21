import { useState, useRef } from 'react';
import { submitEvent } from '../lib/supabase';

export function Submit() {
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
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await submitEvent({
        title: formData.title,
        date: formData.date,
        time: formData.time,
        venue: formData.venue,
        category: formData.category,
        price: formData.price,
        description: formData.description,
        image: '',
        is_exclusive: false,
        district: formData.venue.split(',')[0] || '',
        ticket_url: formData.ticket_url.trim() || null,
        submitter_name: formData.submitter_name,
        submitter_email: formData.submitter_email,
      });
      
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
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
        setFiles([]);
      }, 3000);
    } catch (error) {
      alert('Error submitting event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Submit an Event</h1>
        <p>Share what you know. Freelance editors get paid for approved submissions.</p>
      </div>

      {submitted && (
        <div className="success-message">
          ✅ Event submitted! We'll review and publish within 24 hours.
        </div>
      )}

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
          Freelance editors earn $50 HKD per approved event submission
        </p>
      </form>
    </div>
  );
}
