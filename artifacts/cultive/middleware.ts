const SUPABASE_URL = 'https://qmjdqldmpmeguuyepbsw.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtamRxbGRtcG1lZ3V1eWVwYnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNDkxMzksImV4cCI6MjA5NDgyNTEzOX0.FPUO7-RuPyb1FWwQRKGHnWyDeoDZIVf54xspUsh2_rc';

const CRAWLERS =
  /twitterbot|facebookexternalhit|facebot|linkedinbot|slackbot|whatsapp|telegrambot|discordbot|applebot|ia_archiver|pinterest|redditbot/i;

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const { pathname } = new URL(request.url);

  const match = pathname.match(/^\/event\/([^/?#]+)/);
  if (!match) return;

  const ua = request.headers.get('user-agent') ?? '';
  if (!CRAWLERS.test(ua)) return;

  const id = match[1];

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/events?id=eq.${encodeURIComponent(id)}&select=title,description,image,venue,date&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );
    const rows = await res.json();
    const ev = rows?.[0];
    if (!ev) return;

    const title = escHtml(ev.title ?? 'CULTIVE');
    const plainDesc = escHtml(
      (ev.description ?? '')
        .replace(/<[^>]+>/g, '')
        .trim()
        .slice(0, 200) || 'A cultural event in Hong Kong.',
    );
    const image = escHtml(ev.image ?? '');
    const canonicalUrl = `https://cultive.city/event/${id}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | CULTIVE</title>
  <meta name="description" content="${plainDesc}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${plainDesc}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="CULTIVE" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${plainDesc}" />
  <meta name="twitter:image" content="${image}" />
</head>
<body>
  <h1>${title}</h1>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch {
    return;
  }
}

export const config = {
  matcher: '/event/:path*',
};
