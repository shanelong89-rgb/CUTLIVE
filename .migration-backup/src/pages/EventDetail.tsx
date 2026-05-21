import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getEventById } from '../lib/supabase';
import type { Event } from '../lib/supabase';

interface EventDetailProps {
  setIsAuthOpen?: (open: boolean) => void;
}

export function EventDetail({ setIsAuthOpen }: EventDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

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
          <div className="detail-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {event.venue}
          </div>
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

        <div className="detail-section">
          <h3>What to expect</h3>
          <ul style={{ 
            color: 'var(--n-secondary)', 
            lineHeight: 1.8, 
            paddingLeft: '20px',
            fontSize: '0.9rem'
          }}>
            <li>Curated experience by local experts</li>
            <li>Small group for intimate setting</li>
            <li>Perfect for meeting like-minded people</li>
            <li>Photos and memories to take home</li>
          </ul>
        </div>
      </div>

      <div className="bottom-cta">
        <button className="cta-secondary" onClick={() => navigate(-1)}>Back</button>
        <button className="cta-primary" onClick={handleRSVP}>
          {isExclusive ? 'Get Membership' : 'RSVP Free'}
        </button>
      </div>
    </div>
  );
}
