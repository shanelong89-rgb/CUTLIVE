import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents, type Event } from '../lib/supabase';
import { useSavedEvents } from '../hooks/useSavedEvents';

function displayDate(raw?: string): string {
  if (!raw) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return raw;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function Saved() {
  const { ids, remove, clear } = useSavedEvents();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const all = await getEvents();
      if (!active) return;
      const map = new Map(all.map((e) => [e.id, e] as const));
      const ordered = ids.map((id) => map.get(id)).filter((e): e is Event => !!e);
      setEvents(ordered);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [ids]);

  return (
    <div>
      <header className="header">
        <div className="masthead">
          <div className="masthead-meta">
            <span className="masthead-date">SAVED</span>
          </div>
          <div className="masthead-divider" />
          <h1 className="masthead-title">Your List</h1>
          <p className="masthead-subtitle">
            Events you've bookmarked across Hong Kong — pinned for later.
          </p>
        </div>
      </header>

      <div className="section-header">
        <span className="section-label">
          {loading ? 'Loading…' : `${events.length} saved`}
        </span>
        {events.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Clear all saved events?')) clear();
            }}
            className="section-label"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--n-muted)',
            }}
          >
            Clear all
          </button>
        )}
      </div>

      <div className="event-list">
        {loading ? (
          <div className="saved-empty">Loading your saved events…</div>
        ) : events.length === 0 ? (
          <div className="saved-empty">
            <span className="saved-empty-eyebrow">— NOTHING SAVED —</span>
            <h2 className="saved-empty-title">No bookmarks yet</h2>
            <p className="saved-empty-body">
              Tap the bookmark icon on any event to pin it here for later.
            </p>
            <Link to="/" className="saved-empty-cta">
              Browse Events
            </Link>
          </div>
        ) : (
          events.map((event) => {
            const district = event.district || event.venue.split(',')[0] || '';
            const isExclusive = event.is_exclusive || event.isExclusive;
            return (
              <div key={event.id} className="event-row saved-row">
                <Link to={`/event/${event.id}`} className="event-time">
                  {event.date && <span className="event-date">{displayDate(event.date)}</span>}
                  <span>{event.time || '—'}</span>
                </Link>
                <Link to={`/event/${event.id}`} className="event-thumb">
                  {event.image ? (
                    <img src={event.image} alt={event.title} loading="lazy" />
                  ) : (
                    <div className="event-thumb-placeholder">IMG</div>
                  )}
                </Link>
                <Link to={`/event/${event.id}`} className="event-details">
                  <h4 className="event-title">{event.title}</h4>
                  <p className="event-meta">
                    {event.category}
                    {district ? ` · ${district}` : ''}
                    {isExclusive && ' · Members Only'}
                  </p>
                  <p className="event-venue">{event.venue}</p>
                </Link>
                <button
                  className="saved-remove"
                  onClick={(e) => {
                    e.preventDefault();
                    remove(event.id);
                  }}
                  aria-label="Remove from saved"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
