import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AVAILABLE_TAGS } from '../data/events';
import { getEvents, type Event } from '../lib/supabase';

function formatTime(time?: string): string {
  if (time) return time;
  return '';
}

// If the date is stored as a raw ISO string (YYYY-MM-DD), convert it to
// "Sat, May 23" format. Already-formatted strings pass through unchanged.
function displayDate(raw?: string): string {
  if (!raw) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return raw;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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

// Parse ALL dates out of a multi-date string like "Sat, May 23 & Sat, May 30"
// or "May 23 & 30". keepPast=true retains dates before today (used by month
// filter so the full calendar month is visible, not just future dates).
function parseAllEventDates(raw: string, keepPast = false): Date[] {
  if (!raw) return [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const s = raw.trim();

  // Keywords
  if (s.toLowerCase().includes('today')) return [new Date(today)];
  if (s.toLowerCase().includes('tomorrow')) return [new Date(today.getTime() + 86400000)];

  // ISO date
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return isNaN(d.getTime()) ? [] : [d];
  }

  // Split on & / "and", process each segment
  const segments = s.split(/\s*&\s*|\s+and\s+/i);
  const results: Date[] = [];
  let lastMonth: number | null = null;

  for (const seg of segments) {
    const t = seg.trim();

    // "Month Day" — e.g. "May 23" or "Sat, May 23"
    const mDay = t.match(/\b([A-Za-z]{3,})\s+(\d{1,2})\b/);
    if (mDay) {
      const guess = new Date(`${mDay[1]} ${mDay[2]}, ${now.getFullYear()}`);
      if (!isNaN(guess.getTime())) {
        if (!keepPast && guess.getTime() < today.getTime() - 86400000)
          guess.setFullYear(now.getFullYear() + 1);
        lastMonth = guess.getMonth();
        results.push(guess);
        continue;
      }
    }

    // "Day Month" — e.g. "28 May" or "Thu 28 May" or "Thu, 28 May"
    const dMonth = t.match(/\b(\d{1,2})\s+([A-Za-z]{3,})\b/);
    if (dMonth) {
      const guess = new Date(`${dMonth[2]} ${dMonth[1]}, ${now.getFullYear()}`);
      if (!isNaN(guess.getTime())) {
        if (!keepPast && guess.getTime() < today.getTime() - 86400000)
          guess.setFullYear(now.getFullYear() + 1);
        lastMonth = guess.getMonth();
        results.push(guess);
        continue;
      }
    }

    // Bare day number — reuse the last seen month (e.g. "& 30" after "May 23")
    const bareDay = t.match(/\b(\d{1,2})\b/);
    if (bareDay && lastMonth !== null) {
      const day = parseInt(bareDay[1], 10);
      if (day >= 1 && day <= 31) {
        const d = new Date(now.getFullYear(), lastMonth, day);
        if (!isNaN(d.getTime())) {
          if (!keepPast && d.getTime() < today.getTime() - 86400000)
            d.setFullYear(now.getFullYear() + 1);
          results.push(d);
          continue;
        }
      }
    }

    // Fallback: native parse
    const direct = new Date(t);
    if (!isNaN(direct.getTime())) results.push(direct);
  }

  return results;
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

// Filter events by date using actual parsed dates, not string matching.
function filterByDate(events: Event[], dateFilter: string): Event[] {
  if (dateFilter === 'all') return events;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  // This week: today through the following Sunday night
  const dayOfWeek = todayStart.getDay(); // 0=Sun … 6=Sat
  const daysUntilEndOfWeek = 7 - dayOfWeek; // days until next Sunday (exclusive)
  const weekEnd = new Date(todayStart.getTime() + daysUntilEndOfWeek * 86400000);

  // This weekend: nearest coming Saturday 00:00 → Sunday 23:59
  const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7; // always ≥1 if today isn't Sat
  const weekendStart = dayOfWeek === 6
    ? todayStart                                                    // today is Sat
    : dayOfWeek === 0
      ? todayStart                                                  // today is Sun
      : new Date(todayStart.getTime() + daysUntilSat * 86400000);  // next Sat
  const weekendEnd = new Date(weekendStart.getTime() + (dayOfWeek === 0 ? 1 : 2) * 86400000);

  // Month: first → last day of current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return events.filter(event => {
    const dates = parseAllEventDates(event.date);
    if (dates.length === 0) return false;

    const inRange = (start: Date, end: Date) =>
      dates.some(d => d.getTime() >= start.getTime() && d.getTime() < end.getTime());

    switch (dateFilter) {
      case 'today':
        return inRange(todayStart, todayEnd);
      case 'tomorrow':
        return inRange(todayEnd, new Date(todayEnd.getTime() + 86400000));
      case 'weekend':
        return inRange(weekendStart, weekendEnd);
      case 'week':
        return inRange(todayStart, weekEnd);
      case 'month': {
        const allDates = parseAllEventDates(event.date, true);
        return allDates.some(d => d.getTime() >= monthStart.getTime() && d.getTime() < monthEnd.getTime());
      }
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
        {event.date && <span className="event-date">{displayDate(event.date)}</span>}
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
        {event.tags && event.tags.length > 0 && (
          <div className="event-tag-pills">
            {event.tags.map(t => (
              <span key={t} className="event-tag-pill">{t}</span>
            ))}
          </div>
        )}
        <p className="event-venue">{venueName}</p>
      </div>
    </Link>
  );
}

export function Discover() {
  const [activeTags, setActiveTags] = useState<string[]>([]);
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
    let filtered = events;
    if (activeTags.length > 0) {
      filtered = events.filter(e => {
        if (e.tags && e.tags.length > 0) {
          // Event has tags: show if any overlap with selected
          return e.tags.some(t => activeTags.includes(t));
        }
        // Backward compat: event has no tags yet — match on category lowercase
        return activeTags.includes((e.category ?? '').toLowerCase());
      });
    }
    filtered = filterByDate(filtered, activeDateFilter);

    // Sort: upcoming first (soonest → latest), then undated, then past at the bottom
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTs = todayStart.getTime();
    const decorated = filtered.map((e) => {
      // Use all parsed dates so day-first and multi-date events sort correctly
      const all = parseAllEventDates(e.date, true);
      const upcoming = all.filter(d => d.getTime() >= todayTs);
      // Prefer soonest upcoming; fall back to latest past occurrence
      const parsed = upcoming.length > 0
        ? upcoming.reduce((a, b) => a.getTime() < b.getTime() ? a : b)
        : all.length > 0
          ? all.reduce((a, b) => a.getTime() > b.getTime() ? a : b)
          : null;
      const isPast = parsed ? parsed.getTime() < todayTs : false;
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
  }, [events, activeTags, activeDateFilter]);

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

        {/* Tag Filter — multi-select; clicking All resets */}
        <div className="category-strip">
          <button
            className={`category-chip ${activeTags.length === 0 ? 'active' : ''}`}
            onClick={() => setActiveTags([])}
          >
            All
          </button>
          {AVAILABLE_TAGS.map(tag => (
            <button
              key={tag.id}
              className={`category-chip ${activeTags.includes(tag.id) ? 'active' : ''}`}
              onClick={() =>
                setActiveTags(prev =>
                  prev.includes(tag.id)
                    ? prev.filter(t => t !== tag.id)
                    : [...prev, tag.id]
                )
              }
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section Header */}
      <div className="section-header">
        <span className="section-label">
          {activeTags.length === 0
            ? 'All Events'
            : activeTags.map(t => AVAILABLE_TAGS.find(x => x.id === t)?.label ?? t).join(' · ')}
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
