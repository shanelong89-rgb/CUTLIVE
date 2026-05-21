import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getEventById } from '../lib/supabase';
import type { Event } from '../lib/supabase';
import { useSavedEvents } from '../hooks/useSavedEvents';

interface EventDetailProps {
  setIsAuthOpen?: (open: boolean) => void;
}

// Only allow http(s) URLs as external ticket links — blocks javascript:/data: payloads.
function safeHttpUrl(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
  } catch {
    // not a valid URL
  }
  return '';
}

export function EventDetail({ setIsAuthOpen }: EventDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const { isSaved, toggle } = useSavedEvents();
  const saved = id ? isSaved(id) : false;

  useEffect(() => {
    async function fetchEvent() {
      if (!id) return;
      setLoading(true);
      const data = await getEventById(id);
      setEvent(data);
      setLoading(false);
    }
    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="placeholder-page">
        <h1>Loading event...</h1>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="placeholder-page">
        <h1>Event not found</h1>
        <button className="submit-btn" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const handleRSVP = () => {
    if (event.is_exclusive || event.isExclusive) {
      setIsAuthOpen?.(true);
    } else {
      alert('You\'re on the list! Check your tickets.');
    }
  };

  const isExclusive = event.is_exclusive || event.isExclusive;
  const ticketUrl = safeHttpUrl(event.ticket_url);
  const hasTicketUrl = ticketUrl.length > 0;
  const isFree = /free/i.test(event.price || '');
  const externalLabel = isFree ? 'RSVP at source' : 'Buy Tickets';

  return (
    <div className="detail-page">
      <img src={event.image} alt={event.title} className="detail-image" />
      
      <div className="detail-content">
        <div className="detail-header">
          <span className="detail-category">{event.category}</span>
          {isExclusive && (
            <span className="detail-badge exclusive">Members Only</span>
          )}
        </div>

        <h1 className="detail-title">{event.title}</h1>

        <div className="detail-meta">
          <div className="detail-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {event.date}
          </div>
          <div className="detail-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            {event.time}
          </div>
          <a
            className="detail-row detail-row-link"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Google Maps"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span style={{ textDecoration: 'underline', flex: 1 }}>{event.venue}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14, opacity: 0.5 }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
          <div className="detail-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="8" r="7"/>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
            </svg>
            {event.price}
          </div>
        </div>

        <div className="detail-section">
          <h3>About this event</h3>
          <p style={{ whiteSpace: 'pre-line' }}>
            {event.description?.split('\n').map((line: string, idx: number) => {
              // Check for markdown image: ![alt](url)
              const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
              if (imageMatch) {
                return (
                  <img 
                    key={idx}
                    src={imageMatch[2]} 
                    alt={imageMatch[1]}
                    style={{ 
                      width: '100%', 
                      marginTop: '16px',
                      marginBottom: '16px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      display: 'block'
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                );
              }
              return <span key={idx}>{line}<br/></span>;
            })}
          </p>
        </div>

        {event.image && (
          <div className="detail-section detail-full-image">
            <h3>Image</h3>
            <a
              href={event.image}
              target="_blank"
              rel="noreferrer"
              className="detail-full-image-link"
              title="Open full size in new tab"
            >
              <img src={event.image} alt={event.title} loading="lazy" />
            </a>
          </div>
        )}

      </div>

      <div className="bottom-cta">
        <button className="cta-secondary" onClick={() => navigate(-1)}>Back</button>
        <button
          className={`cta-save ${saved ? 'is-saved' : ''}`}
          onClick={() => id && toggle(id)}
          aria-label={saved ? 'Remove from saved' : 'Save event'}
          title={saved ? 'Saved · tap to remove' : 'Save for later'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        {hasTicketUrl && !isExclusive ? (
          <a
            className="cta-primary"
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {externalLabel} ↗
          </a>
        ) : (
          <button className="cta-primary" onClick={handleRSVP}>
            {isExclusive ? 'Get Membership' : 'RSVP Free'}
          </button>
        )}
      </div>
    </div>
  );
}
