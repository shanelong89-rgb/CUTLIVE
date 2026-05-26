/// <reference lib="dom" />

// Vercel Edge Runtime exposes process.env at runtime; declare it for TS.
declare const process: { env: Record<string, string | undefined> };

/**
 * Vercel Edge Middleware — OG tag injection for social/messaging bots.
 *
 * Handles two URL patterns:
 *  - /event/:id  → event-specific title, description and flyer image
 *  - /?ref=CODE  → invite link preview ("You've been invited to CULTIVE")
 *
 * Real users pass straight through to the React SPA unchanged.
 * Runs at the edge before Vercel's SPA rewrite kicks in.
 */

const BOT_UA =
  /telegrambot|twitterbot|facebookexternalhit|discordbot|whatsapp|slackbot|linkedinbot|ia_archiver|googlebot|bingbot|rogerbot|semrushbot|ahrefsbot/i;

const SITE = 'https://cultive.city';
const LOGO = `${SITE}/favicon.png`;

/** Escape a value for safe insertion into an HTML attribute. */
function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Strip HTML tags and collapse whitespace for a plain-text OG description. */
function toPlainText(html: string, maxLen = 160): string {
  return (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen) || 'A cultural event in Hong Kong.';
}

function ogHtml(opts: {
  pageTitle: string;
  title: string;
  desc: string;
  image: string;
  url: string;
}): Response {
  const { pageTitle, title, desc, image, url } = opts;
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${pageTitle}</title>
  <meta name="description"          content="${desc}"/>
  <meta property="og:type"          content="website"/>
  <meta property="og:site_name"     content="CULTIVE"/>
  <meta property="og:title"         content="${title}"/>
  <meta property="og:description"   content="${desc}"/>
  <meta property="og:image"         content="${image}"/>
  <meta property="og:url"           content="${url}"/>
  <meta name="twitter:card"         content="summary_large_image"/>
  <meta name="twitter:title"        content="${title}"/>
  <meta name="twitter:description"  content="${desc}"/>
  <meta name="twitter:image"        content="${image}"/>
</head>
<body><p><a href="${url}">${title}</a></p></body>
</html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}

export const config = {
  matcher: ['/', '/event/:id+'],
};

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const ua  = request.headers.get('user-agent') ?? '';

  // Only intercept known bot crawlers — real users pass through unchanged.
  if (!BOT_UA.test(ua)) return undefined;

  // ── Invite link: /?ref=CODE ──────────────────────────────────────────────
  const refCode = url.searchParams.get('ref');
  if (url.pathname === '/' && refCode) {
    return ogHtml({
      pageTitle: "You're invited to join CULTIVE | \u6587\u5316\u6d3b",
      title:     "You're invited to join CULTIVE",
      desc:      "Your friend invited you to CULTIVE \u2014 Hong Kong's curated guide to cultural events. Sign up free and start exploring art, music, film, and more.",
      image:     LOGO,
      url:       esc(`${SITE}/?ref=${refCode}`),
    });
  }

  // ── Event page: /event/:id ───────────────────────────────────────────────
  const eventMatch = url.pathname.match(/^\/event\/([^/]+)$/);
  if (!eventMatch) return undefined;

  const id          = eventMatch[1];
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return undefined;

  let event: Record<string, string> | null = null;
  try {
    const res  = await fetch(
      `${supabaseUrl}/rest/v1/events?id=eq.${encodeURIComponent(id)}&select=id,title,description,image,venue,date&limit=1`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } },
    );
    const rows = await res.json();
    event = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch {
    return undefined; // Supabase unreachable — fall through to SPA
  }

  if (!event) return undefined;

  return ogHtml({
    pageTitle: esc(`${event.title} | CULTIVE`),
    title:     esc(event.title),
    desc:      esc(toPlainText(event.description ?? '')),
    image:     esc(event.image || LOGO),
    url:       esc(`${SITE}/event/${event.id}`),
  });
}
