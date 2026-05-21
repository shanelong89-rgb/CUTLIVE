import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { categories } from '../data/events';
import { getEvents, type Event } from '../lib/supabase';

function formatTime(time?: string): string {
  if (time) return time;
  return '';
}

// Parse freeform event date strings into a Date (best-effort).
// Returns null if we can't make sense of it.
function parseEventDate(raw: string, timeStr?: string): Date | null {
  if (!raw) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const s = raw.trim().toLowerCase();

  let base: Date | null = null;
  if (s.includes('today')) base = new Date(today);
  else if (s.includes('tomorrow')) base = new Date(today.getTime() + 86400000);
  else {
    // Try native parse first (handles ISO and "May 24, 2026")
    const direct = new Date(raw);
    if (!isNaN(direct.getTime())) {
      base = direct;
    } else {
      // Match "May 24" or "Sat, May 24" -> add current/next year
      const m = raw.match(/([A-Za-z]{3,})\s+(\d{1,2})/);
      if (m) {
        const guess = new Date(`${m[1]} ${m[2]}, ${now.getFullYear()}`);
        if (!isNaN(guess.getTime())) {
          if (guess.getTime() < today.getTime() - 86400000) {
            guess.setFullYear(now.getFullYear() + 1);
          }
          base = guess;
        }
      }
    }
  }
  if (!base) return null;

  // Apply time if it looks like HH:MM (24h)
  if (timeStr) {
    const tm = timeStr.match(/(\d{1,2})[:\.](\d{2})/);
    if (tm) {
      base.setHours(parseInt(tm[1], 10), parseInt(tm[2], 10), 0, 0);
    }
  }
  return base;
}

function getIssueDate(): string {
  const now = new Date();
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${m[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

// Date filter options
const dateFilters = [
  { id: 'all', label: 'All Dates' },
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'weekend', label: 'This Weekend' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
];

// Filter events by date
function filterByDate(events: Event[], dateFilter: string): Event[] {
  if (dateFilter === 'all') return events;

  return events.filter(event => {
    const dateStr = event.date.toLowerCase();

    switch (dateFilter) {
      case 'today':
        return dateStr.includes('today');
      case 'tomorrow':
        return dateStr.includes('tomorrow');
      case 'weekend':
        return dateStr.includes('sat') || dateStr.includes('sun');
      case 'week':
        return !dateStr.includes('jun') && (dateStr.includes('today') || dateStr.includes('tomorrow') || dateStr.includes('thu') || dateStr.includes('fri') || dateStr.includes('sat') || dateStr.includes('sun'));
      case 'month':
        return dateStr.includes('may');
      default:
        return true;
    }
  });
}

// Event Row Component - Editorial grid style
function EventRow({ event }: { event: Event }) {
  const title = event.title;
  const district = event.district || event.venue.split(',')[0] || '';
  const venueName = event.venue;
  const isExclusive = event.is_exclusive || event.isExclusive;

  return (
    <Link to={`/event/${event.id}`} className="event-row">
      {/* Date + Time Column */}
      <div className="event-time">
        {event.date && <span className="event-date">{event.date}</span>}
        <span>{formatTime(event.time) || '—'}</span>
      </div>

      {/* Thumbnail */}
      <div className="event-thumb">
        {event.image ? (
          <img src={event.image} alt={title} loading="lazy" />
        ) : (
          <div className="event-thumb-placeholder">IMG</div>
        )}
      </div>

      {/* Details */}
      <div className="event-details">
        <h4 className="event-title">{title}</h4>
        <p className="event-meta">
          {event.category}{district ? ` · ${district}` : ''}
          {isExclusive && ' · Members Only'}
        </p>
        <p className="event-venue">{venueName}</p>
      </div>
    </Link>
  );
}

export function Discover() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeDateFilter, setActiveDateFilter] = useState('all');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch events from Supabase
  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      const data = await getEvents();
      // If no data from Supabase, fallback to empty array
      setEvents(data);
      setLoading(false);
    }
    fetchEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    // First filter by category
    let filtered = events;
    if (activeCategory !== 'All') {
      if (activeCategory === 'Exclusive') {
        filtered = events.filter(e => e.is_exclusive || e.isExclusive);
      } else {
        filtered = events.filter(e => e.category === activeCategory);
      }
    }
    // Then filter by date chip
    filtered = filterByDate(filtered, activeDateFilter);

    // Sort: upcoming first (soonest → latest), then undated, then past at the bottom
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const decorated = filtered.map((e) => {
      const parsed = parseEventDate(e.date, e.time);
      const isPast = parsed ? parsed.getTime() < todayStart.getTime() : false;
      return { e, parsed, isPast };
    });
    decorated.sort((a, b) => {
      // Past events always last
      if (a.isPast !== b.isPast) return a.isPast ? 1 : -1;
      // Both have a parsed date → chronological
      if (a.parsed && b.parsed) return a.parsed.getTime() - b.parsed.getTime();
      // One parsed, one not → parsed first
      if (a.parsed) return -1;
      if (b.parsed) return 1;
      return 0;
    });
    return decorated.map((d) => d.e);
  }, [events, activeCategory, activeDateFilter]);

  return (
    <div>
      {/* Masthead Header */}
      <header className="header">
        <div className="masthead">
          <div className="masthead-meta">
            <span className="masthead-date">{getIssueDate()}</span>
          </div>
          
          <div className="masthead-divider" />
          
          <h1 className="masthead-title">What's On</h1>
          
          <p className="masthead-subtitle">
            Hong Kong's curated events. What's worth leaving the house for.
          </p>
        </div>
      </header>

      {/* Date Filter Strip */}
      <div className="filter-strips-container">
        <div className="date-filter-strip">
          {dateFilters.map((filter) => (
            <button
              key={filter.id}
              className={`date-chip ${activeDateFilter === filter.id ? 'active' : ''}`}
              onClick={() => setActiveDateFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="category-strip">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-chip ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Section Header */}
      <div className="section-header">
        <span className="section-label">
          {activeCategory === 'All' ? 'All Events' : activeCategory}
          {activeDateFilter !== 'all' && ` · ${dateFilters.find(d => d.id === activeDateFilter)?.label}`}
        </span>
        <span className="section-label">
          {loading ? 'Loading...' : `${filteredEvents.length} events`}
        </span>
      </div>

      {/* Event List - Editorial Grid */}
      <div className="event-list">
        {loading ? (
          <div style={{ 
            padding: '48px 5vw', 
            textAlign: 'center',
            color: 'var(--n-muted)',
            fontSize: '0.9rem'
          }}>
            Loading events...
          </div>
        ) : filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <EventRow key={event.id} event={event} />
          ))
        ) : (
          <div style={{ 
            padding: '48px 5vw', 
            textAlign: 'center',
            color: 'var(--n-muted)',
            fontSize: '0.9rem'
          }}>
            No events found for this filter.
          </div>
        )}
      </div>

      {/* View All Link */}
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '24px 5vw',
          fontSize: '0.55rem',
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--n-secondary)',
          textDecoration: 'none',
          borderTop: '1px solid var(--n-border)',
        }}
      >
        View all events
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 17L17 7M17 7H7M17 7V17"/>
        </svg>
      </Link>
    </div>
  );
}
