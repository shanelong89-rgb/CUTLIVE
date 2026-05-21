import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents, type Event } from '../lib/supabase';
import { useSavedEvents } from '../hooks/useSavedEvents';
import { googleCalendarUrl, downloadICS } from '../lib/calendar';

function displayDate(raw?: string): string {
  if (!raw) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return raw;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function CalendarDropdown({ event, onClose }: { event: Event; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="cal-dropdown" ref={ref}>
      <a
        href={googleCalendarUrl(event)}
        target="_blank"
        rel="noopener noreferrer"
        className="cal-option"
        onClick={onClose}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        Google Calendar
      </a>
      <button
        className="cal-option"
        onClick={() => { downloadICS(event); onClose(); }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Apple / iCal (.ics)
      </button>
    </div>
  );
}

export function Saved() {
  const { ids, remove, clear } = useSavedEvents();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCalId, setOpenCalId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const all = await getEvents();
      if (!active) return;
      const map = new Map(all.map((e) => [e.id, e] as const));
      const saved = ids.map((id) => map.get(id)).filter((e): e is Event => !!e);

      // Sort earliest date first; undated events go to the bottom
      const parseFirst = (raw?: string): number => {
        if (!raw) return Infinity;
        const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
        if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
        const d = new Date(raw);
        return isNaN(d.getTime()) ? Infinity : d.getTime();
      };
      const ordered = [...saved].sort((a, b) => parseFirst(a.date) - parseFirst(b.date));
      setEvents(ordered);
      setLoading(false);
    })();
    return () => { active = false; };
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
            onClick={() => { if (confirm('Clear all saved events?')) clear(); }}
            className="section-label"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--n-muted)' }}
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
            <Link to="/" className="saved-empty-cta">Browse Events</Link>
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

                <div className="saved-actions">
                  <div className="saved-cal-wrap">
                    <button
                      className="saved-cal-btn"
                      title="Add to calendar"
                      aria-label="Add to calendar"
                      onClick={(e) => {
                        e.preventDefault();
                        setOpenCalId(openCalId === event.id ? null : event.id);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </button>
                    {openCalId === event.id && (
                      <CalendarDropdown
                        event={event}
                        onClose={() => setOpenCalId(null)}
                      />
                    )}
                  </div>
                  <button
                    className="saved-remove"
                    onClick={(e) => { e.preventDefault(); remove(event.id); }}
                    aria-label="Remove from saved"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
