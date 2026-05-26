/**
 * Vercel Edge Middleware — OG tag injection for social/messaging bots.
 *
 * When Telegram, Discord, WhatsApp, Twitter etc. fetch an event URL to
 * generate a link preview, they don't execute JavaScript. This middleware
 * detects those bot user-agents and returns a minimal HTML page that contains
 * the correct Open Graph tags for the event, fetched directly from Supabase.
 *
 * Real users pass straight through to the React SPA as normal.
 * Runs at the edge before Vercel's SPA rewrite kicks in.
 */

const BOT_UA =
  /telegrambot|twitterbot|facebookexternalhit|discordbot|whatsapp|slackbot|linkedinbot|ia_archiver|googlebot|bingbot|rogerbot|semrushbot|ahrefsbot/i;

/** Escape a string for safe insertion into an HTML attribute value. */
function esc(s: string): string {
  return String(s)
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

export const config = {
  matcher: ['/event/:id+'],
};

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);

  // Double-check we're on an event path (config.matcher may not apply on all
  // non-Next.js Vercel deployments).
  const pathMatch = url.pathname.match(/^\/event\/([^/]+)$/);
  if (!pathMatch) return;

  // Only intercept known bot crawlers — real users pass through unchanged.
  const ua = request.headers.get('user-agent') ?? '';
  if (!BOT_UA.test(ua)) return;

  const id = pathMatch[1];
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  // If env vars are missing (shouldn't happen in production), fall through.
  if (!supabaseUrl || !supabaseKey) return;

  let event: Record<string, string> | null = null;
  try {
    const apiRes = await fetch(
      `${supabaseUrl}/rest/v1/events?id=eq.${encodeURIComponent(id)}&select=id,title,description,image,venue,date&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
    );
    const rows = await apiRes.json();
    event = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch {
    // Supabase unreachable — fall through to SPA so the user still sees the page.
    return;
  }

  // Unknown event — fall through.
  if (!event) return;

  const title     = esc(event.title ?? 'CULTIVE');
  const desc      = esc(toPlainText(event.description ?? ''));
  const image     = esc(event.image ?? 'https://cultive.city/favicon.png');
  const canonical = esc(`https://cultive.city/event/${event.id}`);
  const pageTitle = esc(`${event.title} | CULTIVE`);

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${pageTitle}</title>
  <meta name="description" content="${desc}"/>
  <meta property="og:type"        content="website"/>
  <meta property="og:site_name"   content="CULTIVE"/>
  <meta property="og:title"       content="${title}"/>
  <meta property="og:description" content="${desc}"/>
  <meta property="og:image"       content="${image}"/>
  <meta property="og:url"         content="${canonical}"/>
  <meta name="twitter:card"        content="summary_large_image"/>
  <meta name="twitter:title"       content="${title}"/>
  <meta name="twitter:description" content="${desc}"/>
  <meta name="twitter:image"       content="${image}"/>
</head>
<body>
  <p><a href="${canonical}">${title}</a></p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Cache at the edge for 1 hour; serve stale for up to 24 h while revalidating.
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
