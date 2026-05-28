import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://qmjdqldmpmeguuyepbsw.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtamRxbGRtcG1lZ3V1eWVwYnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNDkxMzksImV4cCI6MjA5NDgyNTEzOX0.FPUO7-RuPyb1FWwQRKGHnWyDeoDZIVf54xspUsh2_rc';

async function fetchGoogleFont(family, weight) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}&display=swap`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    },
  ).then((r) => r.text());

  const urlMatch = css.match(
    /src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)\s+format\('woff2'\)/,
  );
  if (!urlMatch) throw new Error(`No woff2 URL for ${family} ${weight}`);
  return fetch(urlMatch[1]).then((r) => r.arrayBuffer());
}

function formatDate(dateStr, dateEndStr) {
  if (!dateStr) return '';
  try {
    const opts = { day: 'numeric', month: 'short' };
    const start = new Date(dateStr).toLocaleDateString('en-GB', opts);
    if (dateEndStr && dateEndStr !== dateStr) {
      const end = new Date(dateEndStr).toLocaleDateString('en-GB', opts);
      return `${start} – ${end}`.toUpperCase();
    }
    return new Date(dateStr)
      .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
      .toUpperCase();
  } catch {
    return '';
  }
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') ?? '';

  let ev = null;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/events?id=eq.${encodeURIComponent(id)}&select=title,image,date,date_end,venue&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    const rows = await r.json();
    ev = rows?.[0] ?? null;
  } catch {
    /* fall through to generic card */
  }

  const [archivoData, interData] = await Promise.all([
    fetchGoogleFont('Archivo Black', 400).catch(() => null),
    fetchGoogleFont('Inter', 500).catch(() => null),
  ]);

  const fonts = [];
  if (archivoData) fonts.push({ name: 'Archivo Black', data: archivoData, weight: 900, style: 'normal' });
  if (interData) fonts.push({ name: 'Inter', data: interData, weight: 500, style: 'normal' });

  const title = ev?.title ?? 'CULTIVE 文化活';
  const image = ev?.image ?? '';
  const dateLabel = formatDate(ev?.date, ev?.date_end);
  const venue = ev?.venue ?? '';
  const hasImage = !!image;
  const titleSize = title.length > 45 ? 46 : title.length > 28 ? 56 : 68;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#080808',
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* ── Left: event photo ──────────────────────────── */}
        {hasImage && (
          <div
            style={{
              width: 490,
              height: 630,
              flexShrink: 0,
              display: 'flex',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <img src={image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* Fade photo into the dark panel */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 180,
                height: '100%',
                background: 'linear-gradient(90deg, rgba(8,8,8,0) 0%, #080808 100%)',
              }}
            />
          </div>
        )}

        {/* ── Right: info panel ──────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: hasImage ? '54px 64px 54px 36px' : '54px 80px',
          }}
        >
          {/* Wordmark */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span
              style={{
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: 21,
                color: '#ffffff',
                letterSpacing: '0.06em',
              }}
            >
              CULTIVE
            </span>
            <span
              style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: 14,
                color: 'rgba(255,255,255,0.38)',
                letterSpacing: '0.04em',
              }}
            >
              文化活
            </span>
          </div>

          {/* Title + date + venue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span
              style={{
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: titleSize,
                color: '#ffffff',
                lineHeight: 1.0,
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </span>

            {dateLabel ? (
              <span
                style={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 19,
                  color: 'rgba(255,255,255,0.58)',
                  letterSpacing: '0.07em',
                }}
              >
                {dateLabel}
              </span>
            ) : null}

            {venue ? (
              <span
                style={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 17,
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.02em',
                }}
              >
                {venue}
              </span>
            ) : null}
          </div>

          {/* Bottom: URL */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span
              style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: 13,
                color: 'rgba(255,255,255,0.2)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              cultive.city
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}
