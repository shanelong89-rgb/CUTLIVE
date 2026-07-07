/**
 * Vercel Serverless Function — per-event OG tag injection.
 *
 * Intercepts GET /event/:slug, fetches the event from Supabase via the
 * REST API (no SDK needed), reads the built index.html, replaces the
 * generic site-wide OG/Twitter tags with event-specific ones, and
 * returns the modified HTML. Scrapers (WhatsApp, Twitter, etc.) that
 * don't execute JS will now see the real event image, title, and
 * description. Real browsers get the exact same SPA they always did.
 *
 * Image is served through /api/og-proxy so third-party hosts that block
 * social crawlers are bypassed.
 */

import fs from 'fs';
import path from 'path';

const SUPABASE_URL    = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON   = process.env.VITE_SUPABASE_ANON_KEY;

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function fetchEvent(slug) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  try {
    const qs = `or=(slug.eq.${encodeURIComponent(slug)},id.eq.${encodeURIComponent(slug)})&limit=1&select=id,slug,title,description,image,category`;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/events?${qs}`, {
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

function readIndexHtml() {
  const candidates = [
    path.join(process.cwd(), 'artifacts/cultive/dist/public/index.html'),
    path.join(__dirname, '../../artifacts/cultive/dist/public/index.html'),
  ];
  for (const p of candidates) {
    try { return fs.readFileSync(p, 'utf8'); } catch {}
  }
  return null;
}

export default async function handler(req, res) {
  const slug = req.query.slug;
  if (!slug) return res.redirect('/');

  const event = await fetchEvent(slug);

  let html = readIndexHtml();
  if (!html) {
    return res.redirect(`/event/${encodeURIComponent(slug)}`);
  }

  if (!event) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }

  const title     = event.title || 'CULTIVE Event';
  const plainDesc = (event.description ?? '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .slice(0, 160) || 'A cultural event in Hong Kong.';
  const eventUrl  = `https://cultive.city/event/${event.slug ?? event.id}`;
  const rawImage  = event.image || '';
  const ogImage   = rawImage
    ? `https://cultive.city/api/og-proxy?url=${encodeURIComponent(rawImage)}`
    : 'https://cultive.city/favicon.png';

  const injected = [
    `<title>${escapeHtml(title)} | CULTIVE</title>`,
    `<meta name="description" content="${escapeHtml(plainDesc)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(plainDesc)}" />`,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`,
    `<meta property="og:url" content="${escapeHtml(eventUrl)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="CULTIVE" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(plainDesc)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`,
  ].join('\n    ');

  html = html
    .replace(/<title>[^<]*<\/title>/, '')
    .replace(/<meta\s[^>]*(?:property="og:[^"]*"|name="(?:twitter:[^"]*|description)")[^>]*\/?>/gi, '')
    .replace('<head>', `<head>\n    ${injected}`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  return res.status(200).send(html);
}
