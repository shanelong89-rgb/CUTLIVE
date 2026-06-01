import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents, type Event } from '../lib/supabase';
import { useSavedEvents } from '../hooks/useSavedEvents';
import { googleCalendarUrl, downloadICS } from '../lib/calendar';

function displayDateRange(date?: string, dateEnd?: string | null): string {
  if (!date) return '';
  const parseYMD = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  };
  const start = parseYMD(date);
  if (!dateEnd) {
    if (start) return start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return date;
  }
  const end = parseYMD(dateEnd);
  if (!start || !end) {
    if (start) return start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return date;
  }
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()} – ${end.getDate()}`;
  }
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
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

function parseFirst(raw?: string): number {
  if (!raw) return Infinity;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? Infinity : d.getTime();
}

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

function sortByDate(list: Event[], descending = false): Event[] {
  return [...list].sort((a, b) => {
    const dateDiff = parseFirst(a.date) - parseFirst(b.date);
    if (dateDiff !== 0) return descending ? -dateDiff : dateDiff;
    const timeDiff = parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    return descending ? -timeDiff : timeDiff;
  });
}

function parseEndDate(raw: string, currentYear: number): Date | null {
  // ISO: 2026-05-29
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  // Text with year already: "May 29, 2026" — try direct parse
  if (/\d{4}/.test(raw)) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) { d.setHours(0, 0, 0, 0); return d; }
  }
  // Text without year: "May 29" — assume current year (no future-bump, we want past detection)
  const d = new Date(`${raw.trim()}, ${currentYear}`);
  if (!isNaN(d.getTime())) { d.setHours(0, 0, 0, 0); return d; }
  // Last resort: "Month Day" anywhere in the string
  const m = raw.match(/([A-Za-z]{3,})\s+(\d{1,2})/);
  if (m) {
    const d2 = new Date(`${m[1]} ${m[2]}, ${currentYear}`);
    if (!isNaN(d2.getTime())) { d2.setHours(0, 0, 0, 0); return d2; }
  }
  return null;
}

function isEventPast(event: Event): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endRaw = event.date_end || event.date;
  if (!endRaw) return false;
  const end = parseEndDate(endRaw, today.getFullYear());
  if (!end) return false;
  return end < today;
}

export function Saved() {
  const { ids, bulkRemove, clear, remove } = useSavedEvents();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCalId, setOpenCalId] = useState<string | null>(null);

  // Cached event map so re-filtering on unsave doesn't need a new API call.
  const allEventsMapRef = useRef<Map<string, Event>>(new Map());
  // Flipped to true after the initial fetch + purge completes.
  const didInitRef = useRef(false);

  // Fetch all events once on mount. Purge orphaned IDs in a single batch so
  // the count is correct everywhere without causing extra API round-trips.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const all = await getEvents();
      if (!active) return;
      const map = new Map(all.map((e) => [e.id, e] as const));
      allEventsMapRef.current = map;

      const orphans = ids.filter((id) => !map.has(id));
      const valid = ids.filter((id) => map.has(id)).map((id) => map.get(id)!);

      setEvents(sortByDate(valid));
      setLoading(false);
      // Mark init done BEFORE bulkRemove so the ids-change effect below
      // sees the flag and knows it can safely re-filter.
      didInitRef.current = true;
      if (orphans.length) bulkRemove(orphans);
    })();
    return () => { active = false; };
  }, []); // intentional: fetch once on mount using ids snapshot

  // Re-filter from the cached map whenever the user explicitly unsaves an event
  // or the cloud sync delivers a different set. The initial purge-triggered ids
  // change is handled above, so no extra API call is needed here.
  useEffect(() => {
    if (!didInitRef.current) return;
    const map = allEventsMapRef.current;
    const valid = ids.filter((id) => map.has(id)).map((id) => map.get(id)!);
    setEvents(sortByDate(valid));
  }, [ids]);

  const upcoming = sortByDate(events.filter(e => !isEventPast(e)), false);
  const past     = sortByDate(events.filter(e =>  isEventPast(e)), true);

  const renderRow = (event: Event, isPast: boolean) => {
    const district = event.district || event.venue.split(',')[0] || '';
    const isExclusive = event.is_exclusive || event.isExclusive;
    return (
      <div key={event.id} className={`event-row saved-row${isPast ? ' event-row--past' : ''}`}>
        <Link to={`/event/${event.slug ?? event.id}`} className="event-time">
          {event.date && <span className="event-date">{displayDateRange(event.date, event.date_end)}</span>}
          <span>{event.time || '—'}</span>
        </Link>
        <Link to={`/event/${event.slug ?? event.id}`} className="event-thumb">
          {event.image ? (
            <img src={event.image} alt={event.title} loading="lazy" />
          ) : (
            <div className="event-thumb-placeholder">IMG</div>
          )}
        </Link>
        <Link to={`/event/${event.slug ?? event.id}`} className="event-details">
          <h4 className="event-title">{event.title}</h4>
          <p className="event-meta">
            {event.category}
            {district ? ` · ${district}` : ''}
            {isExclusive && ' · Members Only'}
          </p>
          <p className="event-venue">{event.venue}</p>
          {event.submitted_by && (
            <p className="event-curator">✦ {event.submitted_by}</p>
          )}
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
  };

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
          {loading
            ? 'Loading…'
            : events.length === 0
              ? '0 saved'
              : `${upcoming.length} upcoming${past.length > 0 ? ` · ${past.length} past` : ''}`}
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
          <>
            {upcoming.map(e => renderRow(e, false))}

            {past.length > 0 && (
              <>
                <div className="saved-past-divider">
                  <span className="saved-past-label">— PAST EVENTS —</span>
                </div>
                {past.map(e => renderRow(e, true))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
