# CULTIVE — Hermes Data Guide

This document tells Hermes exactly how the frontend reads from and writes to the backend, so Hermes can scrape events and publish them without conflicting with or confusing the live app.

---

## 1. Backend overview

- **Platform**: Supabase (PostgreSQL + Auth + Storage + Row Level Security)
- **Project ID**: `qmjdqldmpmeguuyepbsw`
- **Clients**: web app (React/Vite) and mobile app (Expo/React Native) — both use the same Supabase project, same tables

---

## 2. Tables Hermes touches

### `events` — the live event feed

This is the source of truth the frontend displays to users. Every event the app shows lives here.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` PK | Format: `event_<base36timestamp>_<6 random chars>` e.g. `event_lz3k4_ab12cd` |
| `title` | `text` NOT NULL | Display title |
| `date` | `text` NOT NULL | ISO date string: `YYYY-MM-DD` |
| `date_end` | `text` | ISO date string for multi-day events. `null` = single day |
| `time` | `text` | Human-readable, e.g. `"7:00 PM"` or `"19:00"` |
| `venue` | `text` | Venue name, e.g. `"Grotto Fine Art, Central"` |
| `district` | `text` | HK district, e.g. `"Central"`, `"Wan Chai"`, `"Kowloon"` |
| `category` | `text` | One of: `Music`, `Arts`, `Nightlife`, `Food`, `Wellness`, `Market`, `Workshops`, `Exclusive`, `Other` |
| `tags` | `text[]` | Array of lowercase tags, e.g. `["jazz", "nightlife", "outdoor"]` |
| `price` | `text` | Human-readable, e.g. `"Free"`, `"$120"`, `"From $80"` |
| `description` | `text` | Can be plain text or HTML. Frontend renders both via `dangerouslySetInnerHTML` with entity-decoding |
| `image` | `text` | Public image URL. Mobile app uploads to Supabase Storage bucket `submission-images` |
| `ticket_url` | `text` | Link to purchase tickets. `null` if none |
| `source_url` | `text` | Original source URL (Instagram post, website, etc.) |
| `is_exclusive` | `boolean` | Default `false`. `true` = shown under the "Exclusive" filter |
| `rsvp_enabled` | `boolean` | Default `false`. Enables an RSVP button on the event detail page |
| `submitted_by` | `text` | Submitter display name (from submission), shown on event detail |
| `metadata` | `jsonb` | Free-form extra data. Default `{}`. Hermes can store source metadata here |
| `created_at` | `timestamptz` | Auto-set by DB |
| `updated_at` | `timestamptz` | Must be updated manually on edit: `new Date().toISOString()` |

**RLS policy**: Anyone (including anon) can `SELECT`. Only admin users can `INSERT`, `UPDATE`, `DELETE`.

---

### `submissions` — the intake queue

This is where Hermes should write scraped events for human review before they go live. The admin reviews here and approves/rejects. It is also how users submit events via the app.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` PK | Format: `sub_<base36timestamp>_<6 random chars>` e.g. `sub_lz3k4_xy9abc` |
| `status` | `text` | **ENUM**: `pending`, `pending_scrape`, `approved`, `rejected` |
| `submission_type` | `text` | `manual` (form submission) or `instagram` (scraped from IG) |
| `title` | `text` NOT NULL | If scraping is in progress, use `"Pending scrape…"` as placeholder |
| `date` | `text` | ISO date `YYYY-MM-DD`. Can be empty if not yet known |
| `date_end` | `text` | End date for multi-day events |
| `time` | `text` | Event time |
| `venue` | `text` | Venue name |
| `district` | `text` | HK district |
| `category` | `text` | Same values as `events.category` |
| `tags` | `text[]` | Array of tags |
| `price` | `text` | Human-readable price |
| `description` | `text` | Event description |
| `image` | `text` | Image URL |
| `ticket_url` | `text` | Ticket purchase link |
| `instagram_url` | `text` | Original Instagram post URL (for Instagram submissions) |
| `source_id` | `text` | Extracted Instagram post ID from the URL (the shortcode) |
| `submitter_name` | `text` | Name of person who submitted |
| `submitter_email` | `text` | Email of person who submitted (used for notifications) |
| `user_id` | `uuid` | Auto-stamped by DB trigger if the submitter is signed in. `null` for guest/Hermes submissions |
| `scraped_data` | `jsonb` | Raw data from the scrape. Hermes puts its extracted fields here |
| `metadata` | `jsonb` | Free-form extra data. Good place for Hermes to put source metadata, confidence scores, etc. |
| `reviewed_at` | `timestamptz` | Set by admin on approve/reject |
| `published_event_id` | `text` | Set on approve — links to the `events.id` that was created |

**RLS policy**: Anyone (including anon/Hermes with anon key) can `INSERT`. Only admins or the submitting user can `SELECT`, `UPDATE`, `DELETE`. So Hermes can write freely, but cannot read back its own submissions without admin credentials.

---

### `saved_events` — user bookmarks

Hermes does not touch this table. It is managed entirely by the frontend clients.

### `user_read_items` — inbox read state

Hermes does not touch this table. It is managed entirely by the frontend clients.

### `push_tokens` — mobile push notifications

Hermes does not touch this table. Push notifications are sent by the admin web app after approving/rejecting a submission.

---

## 3. The submission lifecycle

```
Hermes scrapes event
        │
        ▼
INSERT into submissions
  status = 'pending_scrape'   ← use this if Hermes needs to enrich later
  status = 'pending'          ← use this if all fields are already populated
        │
        ▼
Admin reviews in Admin Console (/admin)
        │
   ┌────┴────┐
approve      reject
   │              │
   ▼              ▼
INSERT into    status = 'rejected'
events         reviewed_at = now()
status =       Push notification sent
'approved'     to submitter (if mobile)
reviewed_at
published_event_id = new event id
```

**Important DB trigger**: There is a trigger `prevent_auto_approve_on_enrich` on the `submissions` table that prevents any UPDATE from automatically setting `status = 'approved'`. This means Hermes can safely update a `pending_scrape` row with enriched data — it will stay `pending`, never auto-approve. Only admin action through the UI can approve.

---

## 4. How Hermes should write a submission

### Option A — Fully enriched (preferred)

Use this when Hermes has all the data ready.

```json
{
  "id": "sub_<base36_timestamp>_<6_random>",
  "status": "pending",
  "submission_type": "instagram",
  "title": "Jazz Night at The Pawn",
  "date": "2026-06-14",
  "date_end": null,
  "time": "8:00 PM",
  "venue": "The Pawn, Wan Chai",
  "district": "Wan Chai",
  "category": "Music",
  "tags": ["jazz", "live music"],
  "price": "$180",
  "description": "Live jazz featuring...",
  "image": "https://...",
  "ticket_url": "https://...",
  "source_url": "https://www.instagram.com/p/ABC123/",
  "instagram_url": "https://www.instagram.com/p/ABC123/",
  "source_id": "ABC123",
  "submitter_name": "Hermes",
  "submitter_email": null,
  "metadata": {
    "scraped_at": "2026-06-01T10:00:00Z",
    "source": "instagram",
    "confidence": 0.92
  }
}
```

### Option B — Two-phase (scrape first, enrich later)

Use this when Hermes finds the post but needs more time to extract fields.

**Phase 1 — Write stub:**
```json
{
  "id": "sub_...",
  "status": "pending_scrape",
  "submission_type": "instagram",
  "title": "Pending scrape…",
  "instagram_url": "https://www.instagram.com/p/ABC123/",
  "source_id": "ABC123",
  "submitter_name": "Hermes"
}
```

**Phase 2 — Update with scraped data** (must use admin/service role key):
```json
UPDATE submissions SET
  status = 'pending',
  title = 'Jazz Night at The Pawn',
  date = '2026-06-14',
  scraped_data = { "extracted_title": "...", "extracted_date": "...", ... },
  metadata = { "scraped_at": "...", "confidence": 0.9 }
WHERE id = 'sub_...'
```
The trigger will keep `status = 'pending'` — it will NOT jump to `approved`.

---

## 5. How the frontend reads events

### Web app (React/Vite)

- **All events**: `supabase.from('events').select('*').order('date', { ascending: true })`
  - Cached in React component state. No TanStack Query on web — fetched fresh on each page load.
  - Falls back to mock/seed events if the DB returns empty or errors.
- **Single event**: `supabase.from('events').select('*').eq('id', id).single()`
- **Categories**: derived client-side from the returned events — `[...new Set(events.map(e => e.category))]`
- **Filtering**: done entirely client-side (category, district, search text, date, exclusive flag)

### Mobile app (Expo/React Native)

- **All events**: same query, wrapped in TanStack Query with key `["events"]` — cached in memory for the session.
- **Single event**: looked up from the TanStack Query cache, with a fallback to a direct fetch.

### What this means for Hermes

- Events appear immediately after INSERT — no cache-busting or webhook needed.
- The web app re-fetches on page load; mobile re-fetches when the app resumes.
- There is **no pagination** — the frontend fetches all events at once and filters client-side. Keep the events table clean; archived or deleted events should be removed.
- `date` is a plain text string `YYYY-MM-DD`. Events are ordered by `date ascending`. Future events must use the correct ISO date or they'll be sorted wrong.
- `description` can be HTML (with `<p>`, `<strong>`, `<a>` etc.) or plain text. The frontend handles both. Hermes can write either.

---

## 6. ID format

The app generates IDs like this (JavaScript):

```js
function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
// Examples:
// genId('event') → "event_lzb3k4_xy9abc"
// genId('sub')   → "sub_lzb3k4_mn7qrs"
```

Hermes should use the same format. The prefix makes IDs human-readable in logs and the admin console.

---

## 7. Image uploads (mobile)

The mobile app uploads photos to Supabase Storage:
- **Bucket**: `submission-images` (public)
- **Path**: `submissions/<submission_id>/<filename>`
- **URL format**: `https://qmjdqldmpmeguuyepbsw.supabase.co/storage/v1/object/public/submission-images/submissions/<sub_id>/<filename>`

If Hermes has image URLs from Instagram or another source, it can store them directly in `image` — no upload required. Only use the bucket if re-hosting images.

---

## 8. Auth and keys

| Use case | Key to use |
|---|---|
| Writing submissions (INSERT only) | Anon key — RLS allows anyone to insert |
| Reading back submissions | Admin service role key (RLS blocks anon reads) |
| Writing events directly | Admin service role key (RLS blocks anon writes) |
| Reading events | Anon key — fully public |

---

## 9. Fields the admin uses during approval

When the admin approves a submission, the app reads these fields in priority order (direct field → `scraped_data` fallback):

| Event field | Primary | Fallback in `scraped_data` |
|---|---|---|
| `title` | `sub.title` | `scraped_data.extracted_title` |
| `date` | `sub.date` | `scraped_data.extracted_date` |
| `time` | `sub.time` | `scraped_data.extracted_time` |
| `venue` | `sub.venue` | `scraped_data.extracted_venue` |
| `description` | `sub.description` | `scraped_data.extracted_description` |
| `image` | `sub.image` | `scraped_data.extracted_image` |
| `category` | `sub.category` | `scraped_data.extracted_category` |
| `price` | `sub.price` | `scraped_data.extracted_price` |
| `district` | `sub.district` | `scraped_data.extracted_district` |

So Hermes can write enriched data into either the top-level columns or into `scraped_data` with the `extracted_*` keys — both work. Top-level columns are preferred because the admin can edit them directly in the UI.

---

## 10. Auto-tagging (done at approval time by the app)

When an admin approves, the app auto-adds a `"nightlife"` tag if:
- The event time is 17:00 or later, OR
- The title/description/time contains phrases like `"till late"`, `"late night"`, `"midnight"`, `"after dark"`, `"late show"`, `"evening show"`

Hermes does not need to replicate this — it happens automatically on approval.
