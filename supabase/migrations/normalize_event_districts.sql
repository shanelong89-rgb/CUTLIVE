-- Normalize event districts to Title Case.
-- Run manually in the Supabase SQL Editor (same as other migrations in this folder).
-- Fixes inconsistent casing/hyphens (e.g. 'central', 'sheung-wan', 'WAN CHAI').

-- 1. Map known slug/hyphen variants to canonical names (events + submissions)
UPDATE events SET district = m.canonical
FROM (VALUES
  ('central', 'Central'),
  ('sheung-wan', 'Sheung Wan'),
  ('sai-ying-pun', 'Sai Ying Pun'),
  ('tsim-sha-tsui', 'Tsim Sha Tsui'),
  ('wan-chai', 'Wan Chai'),
  ('causeway-bay', 'Causeway Bay'),
  ('hung-hom', 'Hung Hom'),
  ('wong-chuk-hang', 'Wong Chuk Hang'),
  ('north-point', 'North Point'),
  ('tai-kok-tsui', 'Tai Kok Tsui'),
  ('west-kowloon', 'West Kowloon'),
  ('kwai-chung', 'Kwai Chung')
) AS m(slug, canonical)
WHERE lower(regexp_replace(trim(events.district), '\s+', '-', 'g')) = m.slug
  AND events.district IS DISTINCT FROM m.canonical;

UPDATE submissions SET district = m.canonical
FROM (VALUES
  ('central', 'Central'),
  ('sheung-wan', 'Sheung Wan'),
  ('sai-ying-pun', 'Sai Ying Pun'),
  ('tsim-sha-tsui', 'Tsim Sha Tsui'),
  ('wan-chai', 'Wan Chai'),
  ('causeway-bay', 'Causeway Bay'),
  ('hung-hom', 'Hung Hom'),
  ('wong-chuk-hang', 'Wong Chuk Hang'),
  ('north-point', 'North Point'),
  ('tai-kok-tsui', 'Tai Kok Tsui'),
  ('west-kowloon', 'West Kowloon'),
  ('kwai-chung', 'Kwai Chung')
) AS m(slug, canonical)
WHERE lower(regexp_replace(trim(submissions.district), '\s+', '-', 'g')) = m.slug
  AND submissions.district IS DISTINCT FROM m.canonical;

-- 2. Fallback: Title Case any remaining districts (replaces hyphens with spaces)
UPDATE events
SET district = initcap(replace(trim(district), '-', ' '))
WHERE district IS NOT NULL
  AND trim(district) <> ''
  AND district IS DISTINCT FROM initcap(replace(trim(district), '-', ' '));

UPDATE submissions
SET district = initcap(replace(trim(district), '-', ' '))
WHERE district IS NOT NULL
  AND trim(district) <> ''
  AND district IS DISTINCT FROM initcap(replace(trim(district), '-', ' '));

-- 3. Verify results
SELECT district, count(*) FROM events GROUP BY district ORDER BY district;
