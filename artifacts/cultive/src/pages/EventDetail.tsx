import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { getEventById, getEvents } from '../lib/supabase';
import type { Event } from '../lib/supabase';
import { useSavedEvents } from '../hooks/useSavedEvents';
import { useAuth } from '../hooks/useAuth';
import { formatTime, displayDateRange } from '../lib/utils';
import { track } from '../lib/analytics';

// ─── OG / Twitter meta injection ────────────────────────────
function setMetaProperty(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setMetaName(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function applyEventOgTags(event: Event) {
  const url = `https://cultive.city/event/${event.slug ?? event.id}`;
  const plainDesc = (event.description ?? '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .slice(0, 160) || 'A cultural event in Hong Kong.';

  document.title = `${event.title} | CULTIVE`;
  setMetaProperty('og:title', event.title);
  setMetaProperty('og:description', plainDesc);
  setMetaProperty('og:image', event.image || '');
  setMetaProperty('og:url', url);
  setMetaProperty('og:type', 'website');
  setMetaProperty('og:site_name', 'CULTIVE');
  setMetaName('twitter:card', 'summary_large_image');
  setMetaName('twitter:title', event.title);
  setMetaName('twitter:description', plainDesc);
  setMetaName('twitter:image', event.image || '');
  setMetaName('description', plainDesc);
}

function resetOgTags() {
  document.title = 'CULTIVE | 文化活';
  setMetaName('description', "CULTIVE - Hong Kong's curated cultural events");
  ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name'].forEach(p =>
    document.querySelector(`meta[property="${p}"]`)?.remove(),
  );
  ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'].forEach(n =>
    document.querySelector(`meta[name="${n}"]`)?.remove(),
  );
}

function isHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

function unescapeHtmlEntities(str: string): string {
  if (!/&lt;[a-z]/i.test(str)) return str;
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function renderDescription(desc: string): string {
  const unescaped = unescapeHtmlEntities(desc);
  if (isHtml(unescaped)) return unescaped;
  // Plain text: preserve paragraph breaks and line breaks
  const paras = unescaped.split(/\n{2,}/);
  if (paras.length > 1) {
    return paras.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  }
  return `<p style="white-space:pre-line">${unescaped}</p>`;
}

interface EventDetailProps {
  setIsAuthOpen?: (open: boolean) => void;
}

// Only allow http(s) URLs as external ticket links — blocks javascript:/data: payloads.
function safeHttpUrl(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  // Auto-prepend https:// if the URL has no protocol
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProtocol);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
  } catch {
    // not a valid URL
  }
  return '';
}

export function EventDetail({ setIsAuthOpen }: EventDetailProps) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [related, setRelated] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { isSaved, toggle } = useSavedEvents();
  const { user } = useAuth();
  const saved = event ? isSaved(event.id) : false;

  useEffect(() => {
    async function fetchEvent() {
      if (!slug) return;
      setLoading(true);
      const data = await getEventById(slug);
      setEvent(data);
      setLoading(false);
    }
    fetchEvent();
  }, [slug]);

  // Load "More Like This": same category, prefer same district, exclude self & past
  useEffect(() => {
    if (!event) { setRelated([]); return; }
    let cancelled = false;
    (async () => {
      const all = await getEvents();
      if (cancelled) return;
      const todayTs = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
      // Best-effort "not past" check: an event is past only when we can parse a
      // date (ISO end date preferred, else the start date) and it's before today.
      const isPast = (e: Event) => {
        const endRaw = (e.date_end_iso ?? e.date_end ?? '').trim();
        const endM = /^(\d{4})-(\d{2})-(\d{2})$/.exec(endRaw);
        if (endM) {
          return new Date(Number(endM[1]), Number(endM[2]) - 1, Number(endM[3])).getTime() + 86400000 <= todayTs;
        }
        const start = new Date(e.date);
        if (!isNaN(start.getTime())) return start.getTime() + 86400000 <= todayTs;
        return false; // unparseable — keep it
      };
      const sameCategory = all.filter(
        e => e.id !== event.id && e.category === event.category && !isPast(e),
      );
      const districtOf = (e: Event) => (e.district || e.venue?.split(',')[0] || '').trim().toLowerCase();
      const myDistrict = districtOf(event);
      const sameDistrict = myDistrict
        ? sameCategory.filter(e => districtOf(e) === myDistrict)
        : [];
      const rest = sameCategory.filter(e => !sameDistrict.includes(e));
      setRelated([...sameDistrict, ...rest].slice(0, 3));
    })();
    return () => { cancelled = true; };
  }, [event]);

  // Inject OG / Twitter meta tags while on this page
  useEffect(() => {
    if (!event) return;
    applyEventOgTags(event);
    track('event_viewed', { event_id: event.id, event_title: event.title, event_slug: event.slug ?? event.id });
    return resetOgTags;
  }, [event]);

  const eventUrl = event ? `https://cultive.city/event/${event.slug ?? event.id}` : window.location.href;

  const handleCopyLink = useCallback(async () => {
    track('event_shared', { method: 'copy', event_id: event?.id });
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = eventUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [event?.id, eventUrl]);

  const handleNativeShare = useCallback(async () => {
    if (!event) return;
    track('event_shared', { method: 'native', event_id: event.id });
    try {
      await navigator.share({
        title: event.title,
        text: `${event.title} — ${event.venue}`,
        url: eventUrl,
      });
    } catch {
      // User cancelled or not supported — fall back to copy
      handleCopyLink();
    }
  }, [event, eventUrl, handleCopyLink]);

  const shareOnX = useCallback(() => {
    if (!event) return;
    track('event_shared', { method: 'x', event_id: event.id });
    const text = encodeURIComponent(`${event.title} — ${event.venue}`);
    const url = encodeURIComponent(eventUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener');
  }, [event, eventUrl]);

  const shareOnLinkedIn = useCallback(() => {
    track('event_shared', { method: 'linkedin', event_id: event?.id });
    const url = encodeURIComponent(eventUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'noopener');
  }, [event?.id, eventUrl]);

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  if (loading) {
    return (
      <div className="detail-page" aria-busy="true" aria-label="Loading event">
        <div className="skeleton-block skeleton-hero" />
        <div className="detail-content">
          <div className="skeleton-block skeleton-line-sm" style={{ width: 90, marginBottom: 20 }} />
          <div className="skeleton-block skeleton-line-lg" style={{ height: 32, marginBottom: 12 }} />
          <div className="skeleton-block skeleton-line-md" style={{ marginBottom: 28 }} />
          <div className="skeleton-block skeleton-line-md" style={{ marginBottom: 10 }} />
          <div className="skeleton-block skeleton-line-md" style={{ marginBottom: 10 }} />
          <div className="skeleton-block skeleton-line-sm" />
        </div>
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
  const sourceUrl = safeHttpUrl(event.source_url);
  const hasTicketUrl = ticketUrl.length > 0;
  const hasSourceUrl = sourceUrl.length > 0;
  const isFree = /free/i.test(event.price || '');
  const isSourceIG = sourceUrl.includes('instagram.com');
  const externalLabel = hasTicketUrl
    ? (isFree ? 'RSVP at source' : 'Buy Tickets')
    : isSourceIG
    ? 'View on Instagram'
    : 'View at source';

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
            {displayDateRange(event.date, event.date_end_iso ?? event.date_end)}
          </div>
          <div className="detail-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            {formatTime(event.time)}
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

        {/* ── Get Directions ─────────────────────────────── */}
        <a
          className="directions-btn"
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.venue)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('get_directions', { event_id: event.id, venue: event.venue })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          Get Directions
        </a>

        {/* ── Save on WhatsApp ───────────────────────────── */}
        <a
          className="wa-save-btn"
          href={`https://wa.me/85255271026?text=save%20${encodeURIComponent(event.slug ?? event.id)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('whatsapp_save', { event_id: event.id, event_slug: event.slug ?? event.id })}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
          </svg>
          Save this event on WhatsApp
        </a>

        {/* ── Share row ───────────────────────────────────── */}
        <div className="share-row">
          <span className="share-label">Share</span>
          <div className="share-btns">
            {/* X / Twitter */}
            <button className="share-btn" onClick={shareOnX} title="Share on X">
              <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117Z"/>
              </svg>
            </button>

            {/* LinkedIn */}
            <button className="share-btn" onClick={shareOnLinkedIn} title="Share on LinkedIn">
              <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </button>

            {/* Native share (iOS share sheet) — shown only on mobile or when supported */}
            {canNativeShare ? (
              <button className="share-btn" onClick={handleNativeShare} title="Share…">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </button>
            ) : null}

            {/* Copy link */}
            <button className={`share-btn share-btn-copy ${copied ? 'share-btn-copied' : ''}`} onClick={handleCopyLink} title="Copy link">
              {copied ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              )}
              <span className="share-btn-label">{copied ? 'Copied!' : 'Copy link'}</span>
            </button>
          </div>
        </div>

        <div className="detail-section">
          <h3>About this event</h3>
          {event.description ? (
            <div
              className="detail-rich-text cultive-prose"
              dangerouslySetInnerHTML={{ __html: renderDescription(event.description) }}
            />
          ) : null}
        </div>

        {event.submitted_by && (
          <div className="detail-section" style={{ borderTop: '1px solid var(--n-border)', paddingTop: 20 }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--n-muted)', marginBottom: 4 }}>
              Curated by
            </p>
            <p style={{ fontSize: '0.88rem', color: 'var(--n-secondary)', fontWeight: 500 }}>
              {event.submitted_by}
            </p>
          </div>
        )}

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

        {/* ── More Like This ─────────────────────────────── */}
        {related.length > 0 && (
          <div className="detail-section related-section">
            <h3>More Like This</h3>
            <div className="related-grid">
              {related.map(r => (
                <Link key={r.id} to={`/event/${r.slug ?? r.id}`} className="related-card">
                  <div className="related-card-img">
                    {r.image ? (
                      <img src={r.image} alt={r.title} loading="lazy" />
                    ) : (
                      <div className="related-card-placeholder">IMG</div>
                    )}
                  </div>
                  <div className="related-card-body">
                    <span className="related-card-date">
                      {displayDateRange(r.date, r.date_end_iso ?? r.date_end)}
                    </span>
                    <h4 className="related-card-title">{r.title}</h4>
                    <p className="related-card-meta">
                      {r.category}
                      {(r.district || r.venue?.split(',')[0]) ? ` · ${r.district || r.venue.split(',')[0]}` : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>

      <div className="bottom-cta">
        <button className="cta-secondary" onClick={() => navigate(-1)}>Back</button>
        <button
          className={`cta-save ${saved ? 'is-saved' : ''}`}
          onClick={() => {
            if (!event) return;
            const willSave = !saved;
            toggle(event.id);
            if (willSave) track('save_event', { event_id: event.id, event_title: event.title, category: event.category });
          }}
          aria-label={saved ? 'Remove from saved' : 'Save event'}
          title={saved ? 'Saved · tap to remove' : 'Save for later'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        {(hasTicketUrl || hasSourceUrl) && !isExclusive ? (
          <a
            className="cta-primary"
            href={hasTicketUrl ? ticketUrl : sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {externalLabel} ↗
          </a>
        ) : isExclusive && user && (hasTicketUrl || hasSourceUrl) ? (
          <a
            className="cta-primary"
            href={hasTicketUrl ? ticketUrl : sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {externalLabel} ↗
          </a>
        ) : isExclusive && user ? (
          <button className="cta-primary" onClick={() => alert('Contact the organiser directly to apply.')}>
            Contact Organiser
          </button>
        ) : isExclusive ? (
          <button className="cta-primary" onClick={handleRSVP}>
            Get Membership
          </button>
        ) : event.rsvp_enabled ? (
          <button className="cta-primary" onClick={handleRSVP}>
            RSVP Free
          </button>
        ) : null}
      </div>
    </div>
  );
}
