-- ─────────────────────────────────────────────────────────────
-- CULTIVE: Add URL slugs to events
-- Run once in Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────

-- 1. Add column (safe to re-run)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slug text;

-- 2. Backfill: generate a clean kebab-case slug from each event title
UPDATE public.events
SET slug = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(title, '[^A-Za-z0-9 ]', '', 'g'),
      '\s+', '-', 'g'
    ),
    '-{2,}', '-', 'g'
  )
)
WHERE slug IS NULL OR slug = '';

-- Trim any leading/trailing hyphens
UPDATE public.events
SET slug = trim(both '-' from slug)
WHERE slug IS NOT NULL;

-- 3. Resolve duplicates: append the last 6 chars of the internal id
--    (e.g. "art-fair" that appears twice becomes "art-fair" and "art-fair-ab1234")
WITH dupes AS (
  SELECT id, slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at ASC) AS rn
  FROM public.events
  WHERE slug IS NOT NULL
)
UPDATE public.events e
SET slug = d.slug || '-' || right(e.id, 6)
FROM dupes d
WHERE e.id = d.id AND d.rn > 1;

-- 4. Add unique index (fails gracefully if already exists)
CREATE UNIQUE INDEX IF NOT EXISTS events_slug_idx ON public.events (slug);
