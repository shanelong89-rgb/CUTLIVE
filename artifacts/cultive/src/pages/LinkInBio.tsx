import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents, type Event } from '../lib/supabase';
import { displayDateRange } from '../lib/utils';
import { track } from '../lib/analytics';

const WA_NUMBER = '85255271026';
const WA_DISPLAY = '+852 5527 1026';
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hi CULTIVE! Looking for something to do 👀')}`;

function parseIsoDay(raw?: string | null): Date | null {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function eventStart(e: Event): Date | null {
  const iso = parseIsoDay(e.date_iso) ?? parseIsoDay(e.date);
  if (iso) return iso;
  if (!e.date) return null;
  const loose = new Date(e.date);
  return isNaN(loose.getTime()) ? null : loose;
}

function eventEnd(e: Event): Date | null {
  return parseIsoDay(e.date_end_iso ?? e.date_end) ?? eventStart(e);
}

function pickFeatured(events: Event[]): { label: string; picks: Event[] } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Nearest weekend window: Sat 00:00 → Mon 00:00 (Sun keeps just Sunday)
  const dow = todayStart.getDay();
  const daysUntilSat = (6 - dow + 7) % 7 || 7;
  const weekendStart =
    dow === 6 || dow === 0
      ? todayStart
      : new Date(todayStart.getTime() + daysUntilSat * 86400000);
  const weekendEnd = new Date(weekendStart.getTime() + (dow === 0 ? 1 : 2) * 86400000);

  const upcoming = events
    .map(e => ({ e, start: eventStart(e), end: eventEnd(e) }))
    .filter(x => x.start && x.end && x.end.getTime() >= todayStart.getTime())
    .sort((a, b) => a.start!.getTime() - b.start!.getTime());

  const weekend = upcoming.filter(
    x =>
      x.start!.getTime() < weekendEnd.getTime() &&
      x.end!.getTime() >= weekendStart.getTime(),
  );

  if (weekend.length >= 3) return { label: 'This Weekend', picks: weekend.slice(0, 3).map(x => x.e) };
  return { label: 'Coming Up', picks: upcoming.slice(0, 3).map(x => x.e) };
}

export function LinkInBio() {
  const [featured, setFeatured] = useState<{ label: string; picks: Event[] } | null>(null);

  useEffect(() => {
    track('linkinbio_view');
    let cancelled = false;
    getEvents()
      .then(events => {
        if (!cancelled) setFeatured(pickFeatured(events));
      })
      .catch(() => {
        if (!cancelled) setFeatured({ label: 'Coming Up', picks: [] });
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="linkbio-page">
      <div className="linkbio-inner">
        <Link to="/" className="linkbio-logo" onClick={() => track('linkinbio_logo_click')}>
          <span className="logo-text">CULTIVE</span>
          <span className="logo-sub">文化活</span>
        </Link>

        <p className="linkbio-tagline">Text us what you're in the mood for.</p>

        <a
          className="linkbio-wa-btn"
          href={WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('linkinbio_wa_click')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
          </svg>
          <span className="linkbio-wa-text">
            <span className="linkbio-wa-label">Text us on WhatsApp</span>
            <span className="linkbio-wa-number">{WA_DISPLAY}</span>
          </span>
        </a>

        {featured && featured.picks.length > 0 && (
          <div className="linkbio-events">
            <h2 className="linkbio-events-heading">{featured.label}</h2>
            {featured.picks.map(event => (
              <Link
                key={event.id}
                to={`/event/${event.slug ?? event.id}`}
                className="linkbio-event"
                onClick={() => track('linkinbio_event_click', { event_id: event.id })}
              >
                {event.image && (
                  <img
                    src={event.image}
                    alt=""
                    className="linkbio-event-img"
                    loading="lazy"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <span className="linkbio-event-info">
                  <span className="linkbio-event-title">{event.title}</span>
                  <span className="linkbio-event-meta">
                    {displayDateRange(event.date, event.date_end_iso ?? event.date_end)}
                    {event.venue ? ` · ${event.venue}` : ''}
                  </span>
                </span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="16" height="16" className="linkbio-event-arrow">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}

        <div className="linkbio-footer">
          <a
            href="https://www.instagram.com/cultive.city/"
            target="_blank"
            rel="noopener noreferrer"
            className="linkbio-footer-link"
            onClick={() => track('linkinbio_ig_click')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
            @cultive.city
          </a>
          <a href="/partnerships" className="linkbio-footer-link" onClick={() => track('linkinbio_partnerships_click')}>
            Partnerships
          </a>
          <a href="/about" className="linkbio-footer-link" onClick={() => track('linkinbio_about_click')}>
            About
          </a>
        </div>
      </div>
    </div>
  );
}
