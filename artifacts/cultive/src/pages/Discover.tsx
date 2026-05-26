import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AVAILABLE_TAGS, CATEGORY_TAG_MAP, TAG_NORMALIZE } from '../data/events';
import { getEvents, type Event } from '../lib/supabase';
import { formatTime, displayDateRange } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';

const FREE_EVENT_LIMIT = 10;

// Converts any common time string to minutes since midnight for sorting.
// Unknown / missing times sort last within their day (return Infinity).
function parseTimeToMinutes(raw?: string | null): number {
  if (!raw) return Infinity;
  const s = raw.trim().toLowerCase();
  if (s === 'noon') return 12 * 60;
  if (s === 'midnight') return 24 * 60;
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!m) return Infinity;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const period = m[3];
  if (period === 'pm' && h !== 12) h += 12;
  if (period === 'am' && h === 12) h = 0;
  return h * 60 + min;
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

  // Helper: optionally bump a date to next year if it's in the past
  const maybeRoll = (d: Date) => {
    if (!keepPast && d.getTime() < today.getTime() - 86400000)
      d.setFullYear(now.getFullYear() + 1);
    return d;
  };

  for (const seg of segments) {
    const t = seg.trim();

    // Cross-month range — e.g. "May 23 - June 7" or "May 23 - June 7, 2026"
    const rangeX = t.match(/\b([A-Za-z]{3,})\s+(\d{1,2})\s*-\s*([A-Za-z]{3,})\s+(\d{1,2})\b/);
    if (rangeX) {
      const yr = t.match(/\b(20\d{2})\b/)?.[1] ?? String(now.getFullYear());
      const start = new Date(`${rangeX[1]} ${rangeX[2]}, ${yr}`);
      const end   = new Date(`${rangeX[3]} ${rangeX[4]}, ${yr}`);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (!keepPast && end.getTime() < today.getTime() - 86400000) {
          start.setFullYear(Number(yr) + 1);
          end.setFullYear(Number(yr) + 1);
        }
        lastMonth = end.getMonth();
        results.push(start, end);
        continue;
      }
    }

    // Range "Month D1-D2" — e.g. "May 8-27" or "May 8 - 27, 2026"
    const rangeA = t.match(/\b([A-Za-z]{3,})\s+(\d{1,2})\s*-\s*(\d{1,2})\b/);
    if (rangeA) {
      const yr = t.match(/\b(20\d{2})\b/)?.[1] ?? String(now.getFullYear());
      const start = new Date(`${rangeA[1]} ${rangeA[2]}, ${yr}`);
      const end   = new Date(`${rangeA[1]} ${rangeA[3]}, ${yr}`);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        // Only roll both dates if the END is also in the past
        if (!keepPast && end.getTime() < today.getTime() - 86400000) {
          start.setFullYear(Number(yr) + 1);
          end.setFullYear(Number(yr) + 1);
        }
        lastMonth = start.getMonth();
        results.push(start, end);
        continue;
      }
    }

    // Range "D1-D2 Month" — e.g. "8-27 May"
    const rangeB = t.match(/\b(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-z]{3,})\b/);
    if (rangeB) {
      const yr = t.match(/\b(20\d{2})\b/)?.[1] ?? String(now.getFullYear());
      const start = new Date(`${rangeB[3]} ${rangeB[1]}, ${yr}`);
      const end   = new Date(`${rangeB[3]} ${rangeB[2]}, ${yr}`);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (!keepPast && end.getTime() < today.getTime() - 86400000) {
          start.setFullYear(Number(yr) + 1);
          end.setFullYear(Number(yr) + 1);
        }
        lastMonth = start.getMonth();
        results.push(start, end);
        continue;
      }
    }

    // "Month Day" — e.g. "May 23" or "Sat, May 23"
    // Guard: only proceed if the matched word is actually a month name so that
    // weekday prefixes like "Fri 22 May" don't steal the match from "22 May".
    const mDay = t.match(/\b([A-Za-z]{3,})\s+(\d{1,2})\b/);
    if (mDay && /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)$/i.test(mDay[1])) {
      const guess = new Date(`${mDay[1]} ${mDay[2]}, ${now.getFullYear()}`);
      if (!isNaN(guess.getTime())) {
        lastMonth = guess.getMonth();
        results.push(maybeRoll(guess));
        continue;
      }
    }

    // "Day Month" — e.g. "28 May" or "Thu 28 May"
    const dMonth = t.match(/\b(\d{1,2})\s+([A-Za-z]{3,})\b/);
    if (dMonth) {
      const guess = new Date(`${dMonth[2]} ${dMonth[1]}, ${now.getFullYear()}`);
      if (!isNaN(guess.getTime())) {
        lastMonth = guess.getMonth();
        results.push(maybeRoll(guess));
        continue;
      }
    }

    // Bare day number — reuse last seen month (e.g. "& 30" after "May 23")
    const bareDay = t.match(/\b(\d{1,2})\b/);
    if (bareDay && lastMonth !== null) {
      const day = parseInt(bareDay[1], 10);
      if (day >= 1 && day <= 31) {
        const d = new Date(now.getFullYear(), lastMonth, day);
        if (!isNaN(d.getTime())) { results.push(maybeRoll(d)); continue; }
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

    // Use date_end so ongoing multi-day events match the active filter
    const endOverride = (() => {
      if (!event.date_end) return null;
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(event.date_end.trim());
      if (!m) return null;
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return isNaN(d.getTime()) ? null : d;
    })();

    const inRange = (start: Date, end: Date) => {
      if (dates.some(d => d.getTime() >= start.getTime() && d.getTime() < end.getTime())) return true;
      // Ongoing multi-day event: started before range ends AND ends after range starts
      if (endOverride) {
        const eventStart = dates.reduce((a, b) => a.getTime() < b.getTime() ? a : b);
        return eventStart.getTime() < end.getTime() && endOverride.getTime() >= start.getTime();
      }
      return false;
    };

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
        if (allDates.some(d => d.getTime() >= monthStart.getTime() && d.getTime() < monthEnd.getTime())) return true;
        if (endOverride) {
          const eventStart = allDates.length > 0 ? allDates.reduce((a, b) => a.getTime() < b.getTime() ? a : b) : null;
          return !!eventStart && eventStart.getTime() < monthEnd.getTime() && endOverride.getTime() >= monthStart.getTime();
        }
        return false;
      }
      default:
        return true;
    }
  });
}

// Event Row Component - Editorial grid style
function EventRow({ event, isPast = false }: { event: Event; isPast?: boolean }) {
  const title = event.title;
  const district = event.district || event.venue.split(',')[0] || '';
  const venueName = event.venue;
  const isExclusive = event.is_exclusive || event.isExclusive;

  return (
    <Link to={`/event/${event.id}`} className={`event-row${isPast ? ' event-row--past' : ''}`}>
      {/* Date + Time Column */}
      <div className="event-time">
        {event.date && <span className="event-date">{displayDateRange(event.date, event.date_end)}</span>}
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
        {event.submitted_by && (
          <p className="event-curator">✦ {event.submitted_by}</p>
        )}
      </div>
    </Link>
  );
}

const PAGE_SIZE = 20;

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.documentElement.scrollTo({ top: 0, behavior: 'instant' });
  document.body.scrollTo({ top: 0, behavior: 'instant' });
}

export function Discover({ setIsAuthOpen }: { setIsAuthOpen?: (open: boolean) => void }) {
  const { user } = useAuth();
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeDateFilter, setActiveDateFilter] = useState('all');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const setCurrentPage = (n: number | ((p: number) => number)) => {
    const next = typeof n === 'function' ? n(currentPage) : n;
    setSearchParams(p => { const s = new URLSearchParams(p); s.set('page', String(next)); return s; }, { replace: false });
  };

  // Fetch events from Supabase — stale-while-revalidate:
  // serve cache instantly, then silently refresh in the background.
  useEffect(() => {
    let cancelled = false;
    async function fetchEvents() {
      setLoading(true);
      const data = await getEvents((fresh) => {
        if (!cancelled) setEvents(fresh);
      });
      if (!cancelled) {
        setEvents(data);
        setLoading(false);
      }
    }
    fetchEvents();
    return () => { cancelled = true; };
  }, []);

  // Reset to page 1 whenever filters change (replace so filter changes don't stack in history)
  useEffect(() => {
    setSearchParams(p => { const s = new URLSearchParams(p); s.set('page', '1'); return s; }, { replace: true });
  }, [activeTags, activeDateFilter]);

  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (activeTags.length > 0) {
      filtered = events.filter(e => {
        // Build the full effective tag set: explicit tags + category-derived tag
        const categoryTag = CATEGORY_TAG_MAP[e.category ?? ''];
        const effectiveTags = new Set(
          [...(e.tags ?? []), ...(categoryTag ? [categoryTag] : [])].map(t => TAG_NORMALIZE[t] ?? t)
        );
        if (effectiveTags.size > 0) {
          return activeTags.some(t => effectiveTags.has(t));
        }
        // Last-resort fallback for truly unclassified events
        return activeTags.includes((e.category ?? '').toLowerCase());
      });
    }
    filtered = filterByDate(filtered, activeDateFilter);

    // Sort: upcoming first (soonest → latest), then undated, then past at the bottom
    const now = new Date();
    const nowTs = now.getTime();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTs = todayStart.getTime();
    const decorated = filtered.map((e) => {
      const all = parseAllEventDates(e.date, true);
      if (all.length === 0) return { e, parsed: null, isPast: false, endTs: 0 };
      const minDate = all.reduce((a, b) => a.getTime() < b.getTime() ? a : b);
      const maxDate = all.reduce((a, b) => a.getTime() > b.getTime() ? a : b);

      // Effective end timestamp:
      // • With date_end → end of that calendar day (midnight of the following day)
      // • Without date_end, starts 9 pm+ → start time + 9 h grace (covers HK late nights til ~6 am)
      // • Otherwise → end of the calendar day (midnight + 24 h)
      let effectiveEndTs: number;
      if (e.date_end) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.date_end.trim());
        if (m) {
          const endDay = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
          endDay.setDate(endDay.getDate() + 1);
          effectiveEndTs = endDay.getTime();
        } else {
          effectiveEndTs = maxDate.getTime() + 24 * 60 * 60 * 1000;
        }
      } else {
        const startMins = parseTimeToMinutes(e.time);
        const isLateNight = isFinite(startMins) && startMins >= 21 * 60; // 9 pm+
        if (isLateNight) {
          effectiveEndTs = maxDate.getTime() + startMins * 60 * 1000 + 9 * 60 * 60 * 1000;
        } else {
          effectiveEndTs = maxDate.getTime() + 24 * 60 * 60 * 1000;
        }
      }

      const isPast = nowTs >= effectiveEndTs;
      const isOngoing = !isPast && minDate.getTime() < todayTs;

      if (!isPast) {
        // Ongoing events (already started, not yet ended) sort by their start date
        // so they always appear before purely upcoming events.
        if (isOngoing) {
          return { e, parsed: minDate, isPast: false, endTs: effectiveEndTs };
        }
        const upcoming = all.filter(d => d.getTime() >= todayTs);
        if (upcoming.length > 0) {
          const parsed = upcoming.reduce((a, b) => a.getTime() < b.getTime() ? a : b);
          return { e, parsed, isPast: false, endTs: effectiveEndTs };
        }
        return { e, parsed: minDate, isPast: false, endTs: effectiveEndTs };
      }
      return { e, parsed: maxDate, isPast: true, endTs: effectiveEndTs };
    });
    decorated.sort((a, b) => {
      if (a.isPast !== b.isPast) return a.isPast ? 1 : -1;
      if (a.isPast && b.isPast) {
        // Most recently ended → top of past section; oldest ended → bottom
        if (a.endTs !== b.endTs) return b.endTs - a.endTs;
        if (a.parsed && b.parsed) return b.parsed.getTime() - a.parsed.getTime();
        return 0;
      }
      if (a.parsed && b.parsed) {
        const dateDiff = a.parsed.getTime() - b.parsed.getTime();
        if (dateDiff !== 0) return dateDiff;
        return parseTimeToMinutes(a.e.time) - parseTimeToMinutes(b.e.time);
      }
      if (a.parsed) return -1;
      if (b.parsed) return 1;
      return 0;
    });
    // Hide events more than 14 days past (kept in DB for future recaps)
    const cutoff = todayTs - 14 * 86400000;
    return decorated
      .filter(d => !d.isPast || !d.parsed || d.parsed.getTime() >= cutoff)
      .map(d => ({ e: d.e, isPast: d.isPast }));
  }, [events, activeTags, activeDateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const pagedEvents = filteredEvents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
          {loading ? 'Loading…' : totalPages > 1 ? `${filteredEvents.length} events · pg ${currentPage}/${totalPages}` : `${filteredEvents.length} events`}
        </span>
      </div>

      {/* Event List - Editorial Grid */}
      <div className="event-list">
        {loading ? (
          <div style={{ padding: '48px 5vw', textAlign: 'center', color: 'var(--n-muted)', fontSize: '0.9rem' }}>
            Loading events...
          </div>
        ) : pagedEvents.length > 0 ? (
          <>
            {(user ? pagedEvents : pagedEvents.slice(0, FREE_EVENT_LIMIT)).map(({ e, isPast }) => (
              <EventRow key={e.id} event={e} isPast={isPast} />
            ))}
            {!user && filteredEvents.length > FREE_EVENT_LIMIT && (
              <div className="event-gate">
                <div className="event-gate-blur">
                  {pagedEvents.slice(FREE_EVENT_LIMIT, FREE_EVENT_LIMIT + 3).map(({ e, isPast }) => (
                    <EventRow key={e.id} event={e} isPast={isPast} />
                  ))}
                </div>
                <div className="event-gate-wall">
                  <p className="event-gate-count">
                    +{filteredEvents.length - FREE_EVENT_LIMIT} more events
                  </p>
                  <h3 className="event-gate-headline">Join CULTIVE to see everything</h3>
                  <p className="event-gate-body">
                    Free to join. See all events, save favourites, and submit your own.
                  </p>
                  <button className="event-gate-cta" onClick={() => setIsAuthOpen?.(true)}>
                    Sign Up — It's Free
                  </button>
                  <p className="event-gate-sub">Already a member? <button className="event-gate-link" onClick={() => setIsAuthOpen?.(true)}>Sign in</button></p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '48px 5vw', textAlign: 'center', color: 'var(--n-muted)', fontSize: '0.9rem' }}>
            No events found for this filter.
          </div>
        )}
      </div>

      {/* Pagination — hidden for guests (they only see first 10) */}
      {!loading && totalPages > 1 && !!user && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 5vw',
          borderTop: '1px solid var(--n-border)',
        }}>
          <button
            onClick={() => { setCurrentPage(p => p - 1); scrollToTop(); }}
            style={{
              visibility: currentPage > 1 ? 'visible' : 'hidden',
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px',
              border: '1px solid var(--n-border)',
              borderRadius: 4,
              background: 'transparent',
              fontSize: '0.6rem',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--n-text)',
              cursor: 'pointer',
            }}
          >
            ← Prev
          </button>

          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => { setCurrentPage(n); scrollToTop(); }}
                style={{
                  width: 32, height: 32,
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: n === currentPage ? 'var(--n-text)' : 'var(--n-border)',
                  background: n === currentPage ? 'var(--n-text)' : 'transparent',
                  color: n === currentPage ? '#fff' : 'var(--n-secondary)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setCurrentPage(p => p + 1); scrollToTop(); }}
            style={{
              visibility: currentPage < totalPages ? 'visible' : 'hidden',
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px',
              border: '1px solid var(--n-border)',
              borderRadius: 4,
              background: 'transparent',
              fontSize: '0.6rem',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--n-text)',
              cursor: 'pointer',
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
