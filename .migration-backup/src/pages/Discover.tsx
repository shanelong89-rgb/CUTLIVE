import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { categories } from '../data/events';
import { getEvents, type Event } from '../lib/supabase';

function formatTime(time?: string): string {
  if (time) return time;
  return '';
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
      {/* Time Column */}
      <div className="event-time">
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
    // Then filter by date
    return filterByDate(filtered, activeDateFilter);
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
