const SUPABASE_URL = 'https://qmjdqldmpmeguuyepbsw.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtamRxbGRtcG1lZ3V1eWVwYnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNDkxMzksImV4cCI6MjA5NDgyNTEzOX0.FPUO7-RuPyb1FWwQRKGHnWyDeoDZIVf54xspUsh2_rc';

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const enc = encodeURIComponent(id);
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/events?or=(slug.eq.${enc},id.eq.${enc})&select=id,slug,title,description,image,venue,date&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );
    const rows = await r.json();
    const ev = rows?.[0];

    if (!ev) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(genericHtml());
    }

    const title = escHtml(ev.title || 'CULTIVE');
    const rawDesc = (ev.description || '').replace(/<[^>]+>/g, '').trim();
    const fallbackDesc = [
      ev.venue ? `At ${ev.venue}.` : '',
      'Discover curated cultural events in Hong Kong on CULTIVE.',
    ]
      .filter(Boolean)
      .join(' ');
    const desc = escHtml((rawDesc.length >= 20 ? rawDesc : fallbackDesc).slice(0, 300));
    const image = escHtml(ev.image || '');
    const url = `https://cultive.city/event/${ev.slug || ev.id || id}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | CULTIVE</title>
  <meta name="description" content="${desc}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="CULTIVE" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${image}" />
</head>
<body>
  <h1>${title}</h1>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);
  } catch {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(genericHtml());
  }
}

function genericHtml() {
  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8" />
  <title>CULTIVE | 文化活</title>
  <meta property="og:site_name" content="CULTIVE" />
  <meta name="description" content="Hong Kong's curated cultural events." />
</head><body><h1>CULTIVE</h1></body></html>`;
}
