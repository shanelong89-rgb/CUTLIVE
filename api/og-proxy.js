/**
 * Vercel Serverless Function — image proxy for OG previews.
 *
 * Fetches a remote image and re-serves it from the cultive.city domain,
 * bypassing third-party image hosts that block social-media crawlers.
 *
 * Usage: /api/og-proxy?url=<encoded_image_url>
 */

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB safety cap

export default async function handler(req, res) {
  const rawUrl = req.query.url;

  if (!rawUrl) {
    return res.status(400).send('Missing url parameter');
  }

  let targetUrl;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return res.status(400).send('Invalid url parameter');
  }

  if (targetUrl.protocol !== 'https:' && targetUrl.protocol !== 'http:') {
    return res.status(400).send('Only http/https URLs are allowed');
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CultiveBot/1.0)',
        Accept: 'image/*',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok) {
      return res.status(502).send('Upstream image fetch failed');
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    const baseType = contentType.split(';')[0].trim().toLowerCase();

    if (!ALLOWED_CONTENT_TYPES.includes(baseType)) {
      return res.status(415).send('Upstream is not an image');
    }

    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > MAX_SIZE) {
      return res.status(413).send('Image too large');
    }

    res.setHeader('Content-Type', baseType);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error('[og-proxy] error:', err?.message ?? err);
    return res.status(502).send('Image proxy error');
  }
}
