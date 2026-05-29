# CULTIVE — Event Slug System

## What it is

Every event has a human-readable URL slug (e.g. `cultive.city/event/hkbu-bava-grad-show-2026`) stored in the `slug` column on the `events` table, alongside the internal `id` (`ev_xxx...`).

## How slugs are generated

On `createEvent()` in `src/lib/supabase.ts`:

1. `slugify(title)` — lowercases the title, strips non-alphanumeric chars, collapses spaces to hyphens, trims, truncates to 80 chars
2. `generateUniqueSlug(title)` — queries the DB for any existing slugs matching `base%`, then appends `-2`, `-3`, etc. if the base slug is already taken
3. The slug is stored alongside the auto-generated `id` on insert

## Database

- Column: `slug text` on `public.events`, with a `UNIQUE INDEX events_slug_idx`
- Migration to add + backfill: `supabase/migrations/add_slug_to_events.sql` (must be run manually in Supabase SQL Editor — it was **not** auto-applied)
- Existing events were backfilled: slugs generated from their titles; any duplicates got the last 6 chars of their `id` appended

## Lookups (backward compat)

`getEventById(slugOrId)` in `supabase.ts` accepts either a slug or a raw `ev_xxx` id:

- Checks mock events: `find(e => e.id === slugOrId || e.slug === slugOrId)`
- Checks localStorage cache the same way
- Falls back to DB: `.or('slug.eq.X,id.eq.X')` — so old links never 404

## Links throughout the app

All event links use `event.slug ?? event.id` as the URL param:

- `Discover.tsx` — `<Link to={/event/${event.slug ?? event.id}}>`
- `Saved.tsx` — same pattern (three link targets per row)
- `EventDetail.tsx` — share URL and OG meta tags use `event.slug ?? event.id`
- Route in `App.tsx`: `/event/:slug` (param name is `slug`, not `id`)

## The Event type

Both type definitions carry the field:

- `src/lib/supabase.ts` — `slug?: string | null`
- `src/data/events.ts` (mock events type) — `slug?: string | null`

## Key rule for future work

- **Never use `event.id` directly in a URL.** Always use `event.slug ?? event.id`.
- **`toggle(event.id)` / `isSaved(event.id)`** in saved-events logic should still use `event.id` (not slug) — the saved-events store keys by internal id.
- When updating an event via `updateEvent(id, patch)`, the `id` param is always the internal `ev_xxx` id, not the slug.
