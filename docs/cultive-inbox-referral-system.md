# CULTIVE — Inbox, Referral & Credit System

Last updated: May 2026

---

## Overview

Three interlinked systems built on top of Supabase + React:

1. **Inbox** — in-app notification feed surfacing submission status, saved-event reminders, and credit/referral events
2. **Credits** — HK$ credit balance earned by submitting events and inviting friends
3. **Referrals** — unique invite-link system that awards credits to both the inviter and the new user

---

## Database Schema (Supabase)

### Core tables (in `supabase/schema.sql`)

| Table | Purpose |
|---|---|
| `events` | Published events. Key fields: `id text`, `date text`, `date_end text`, `tags text[]`, `ticket_url`, `source_url`, `submitted_by`, `rsvp_enabled`, `metadata jsonb` |
| `submissions` | User-submitted events awaiting review. Fields mirror `events` plus: `status` (`pending` / `pending_scrape` / `approved` / `rejected`), `user_id`, `submitter_email`, `submission_type` (`manual` / `instagram`), `instagram_url`, `source_id`, `scraped_data jsonb`, `reviewed_at`, `published_event_id` |
| `saved_events` | `(user_id, event_id)` pairs — which events each user has bookmarked |
| `user_read_items` | `(user_id, item_key)` — which inbox message IDs a user has read (synced across devices) |
| `push_tokens` | Expo push tokens keyed by `email` — used to deliver mobile push notifications on submission review |

### Credits & referral tables (in `supabase/migrations/credits_and_referrals.sql`)

| Table | Purpose |
|---|---|
| `user_credits` | One row per user: `user_id uuid PK`, `balance integer` |
| `credit_transactions` | Full audit trail: `amount`, `type` (`submission_approved` / `referral_bonus` / `referral_invitee_bonus` / `manual` / `redemption`), `description`, `reference_id` |
| `referral_codes` | One unique code per user (`code text PK`, `user_id`) |
| `referrals` | Who invited whom: `(inviter_id, invitee_id, code)` — `invitee_id` is UNIQUE (one referral per new user) |

### Database functions (SECURITY DEFINER — bypass RLS)

| Function | What it does |
|---|---|
| `get_or_create_referral_code()` | Returns the caller's referral code, generating one from their UUID if it doesn't exist yet |
| `apply_referral_code(p_code)` | New user applies an invite code → inserts into `referrals`, awards HK$25 to inviter. Guards: can't self-refer, can't apply twice |
| `award_submission_credits(p_submitter_user_id, p_submission_id)` | Awards HK$50 when a submission is approved. Idempotent — skips if `reference_id` already exists in `credit_transactions` |
| `award_credits(p_user_id, p_amount, p_type, ...)` | Internal helper: upserts `user_credits`, inserts `credit_transactions` row |

### Manual migrations applied in Supabase SQL Editor

These are **not auto-applied** — they must be run manually:

- `add_date_end_to_events_and_submissions.sql` — adds `date_end text` to both tables
- `add_metadata_to_events_and_submissions.sql` — adds `metadata jsonb` to both tables
- `prevent_auto_approve_on_enrich.sql` — DB trigger that keeps enriched (`pending_scrape → pending`) submissions in `pending` status instead of auto-approving them
- `add_referral_invitee_bonus.sql` — adds `referral_invitee_bonus` to the credit type CHECK constraint (allows new users to also earn credits when they accept an invite)

---

## Frontend Architecture

### Auth (`src/hooks/useAuth.ts`)

- Uses `supabase.auth.getSession()` (localStorage read, ~0ms) instead of `getUser()` (server round-trip)
- Sets `loading = false` immediately once session is known
- Admin check (`isAdmin()`) runs asynchronously in the background — never blocks page render
- Admin is hardcoded by email (`shanelong89@gmail.com`, `shanelong@gmail.com`) — no DB call needed
- Guards against Google OAuth popup clearing the main window's session (`window.opener !== null` check)
- Visibility-change handler re-checks session when tab becomes active again

### Supabase client (`src/lib/supabase.ts`)

- **Singleton pattern**: client is stored on `window.__cultive_supabase__` so HMR re-evaluation reuses the same `GoTrueClient` instance (prevents "Multiple GoTrueClient instances" warning and auth state conflicts)
- **`getSessionUser()` helper**: all DB utility functions use this instead of `getUser()` — reads from localStorage, no network call
- **Events cache**: two-layer stale-while-revalidate cache (in-memory + localStorage, 10-minute TTL). `getEvents()` returns cached data immediately and fires a background re-fetch. `getEventById()` checks the warm cache before hitting the DB

### Inbox system

**Context** (`src/contexts/InboxContext.tsx` + `src/hooks/useInboxMessages.ts`)

- `InboxProvider` wraps the whole app — inbox data is loaded once at mount, shared across all pages via context
- `useInboxMessages` is the core hook; `useInbox` is the consumer hook

**Data sources combined into the inbox feed:**
1. **Submissions** — fetched via `getMySubmissions()` (matches by `user_id` OR `submitter_email` for backward compat)
2. **Credit transactions** — fetched via `getCreditTransactions()` — generates referral-joined / referral-invitee / submission-credit messages
3. **Saved events** — fetched from `events` table using the IDs stored in localStorage (`cultive:saved-events`) — generates time-sensitive reminder messages
4. **Welcome message** — synthesised from `user.created_at`, always present

**Message kinds:**
- `submission-pending` / `submission-approved` / `submission-rejected`
- `saved-reminder` (upcoming), `saved-reminder-tomorrow`, `saved-reminder-soon` (happening now / within 2 hours)
- `referral-joined` (inviter earns credit), `referral-invitee` (new user earns welcome bonus)
- `submission-credit` (HK$50 earned on approval)
- `welcome`

**Sorting:** by `createdAt` descending. "Happening now" / "starting soon" messages get synthetic `createdAt` of `now - 60s` so they always float to the top among unread.

**Read state:**
- Stored locally in `localStorage` under `cultive:read-messages` (array of message IDs)
- Synced to/from `user_read_items` table in Supabase (for cross-device consistency)
- Remote sync is non-blocking — local state renders first, remote keys merged quietly in background
- `markRead(id)` / `markAllRead()` update local state + write to remote
- Status-change detection: if a submission moves to `approved` or `rejected`, its previously-read message IDs are removed from `readIds` so the new status surfaces as unread again

**Realtime:** subscribes to `postgres_changes` on `submissions`, `user_read_items`, and `credit_transactions` tables filtered by `user_id`. Self-triggered realtime events (from `markRead` upserts) are suppressed with a 3-second cooldown.

**Caching:**
- Submissions and credit transactions cached per user: `cultive:inbox-subs:{userId}`, `cultive:inbox-txs:{userId}`
- On return visits, cached data renders immediately; fresh data fetched in background
- All three data sources fetched in parallel via `Promise.all`

**Saved-event reminder logic (`buildSavedReminders`):**
- 14-day lookback window (events older than 14 days before today are dropped)
- For multi-day events: uses `date_end` as the effective end — card stays visible for the full run
- Single-day events: only shown as "Happening now" if `startDate >= todayStart` (past single-day events are correctly filtered out)
- Time-sensitive tiers: happening now → within 2 hours (shows Maps link) → tomorrow → upcoming

**Inbox page** (`src/pages/Inbox.tsx`):
- Read messages dimmed to `opacity: 0.35` (matches ended-events style), restore to `0.7` on hover
- "Mark all as read" button shown only when there are unread messages
- Maps directions button for soon/tomorrow reminders (opens Google Maps)

### Referral flow (`src/App.tsx`)

1. User visits `cultive.city/?ref=CODE`
2. `REF_CODE_KEY` saved to localStorage, invite banner flag set in sessionStorage
3. If not signed in, auth modal auto-opens after 700ms
4. On `SIGNED_IN` event (new account only — checked via `created_at` within 5 minutes): `applyReferralCode(code)` is called → DB function awards HK$25 to inviter, records referral
5. Invite banner shown to unauthenticated users with a "Sign Up" CTA

The `add_referral_invitee_bonus.sql` migration also awards a bonus to the new user (invitee) when they accept an invite — this shows as a `referral_invitee_bonus` transaction and a "Welcome bonus" inbox message.

### Account page (`src/pages/Account.tsx`)

Displays:
- Credit balance (cached per user under `cultive:credit-balance:{userId}`, instant on return)
- Transaction history (cached under `cultive:credit-tx:{userId}`)
- Referral code with copy-to-clipboard + shareable link (`cultive.city/?ref=CODE`)
- Saved event count (validated against DB to drop deleted events)
- Submission count (pulled from inbox context)
- Password reset flow

### Admin panel (`src/pages/Admin.tsx`)

- Gated by `isAdmin()` — email-based check, no DB call
- Lists all submissions filterable by status
- Approve action: creates event in `events` table → awards HK$50 credit → updates submission status → sends Expo push notification to submitter's device
- Reject action: updates status → sends push notification
- Push notifications delivered via Expo Push API (`https://exp.host/--/api/v2/push/send`) using tokens stored in `push_tokens` table

### Navigation

- Desktop: `WebNav` in `App.tsx` uses React Router `NavLink` / `Link` — fully client-side, no page reloads
- Mobile: `TabBar` uses `NavLink` — also client-side
- Both show the unread count badge on the Inbox tab

### Submit page (`src/pages/Submit.tsx`)

- Two submission paths: Instagram URL quick-submit and manual form
- Auth-gated (requires sign-in)
- Pre-populates name/email from the logged-in user's profile
- Instagram submissions stored with `submission_type: 'instagram'`, `status: 'pending_scrape'` — an enrichment worker processes them separately
- Manual submissions stored with all fields directly

---

## Performance optimisations applied

| Change | Impact |
|---|---|
| `getUser()` → `getSessionUser()` across all 12 DB functions | Eliminates ~150–300ms server auth round-trip per call |
| `isAdmin()` removed DB RPC fallback | Non-admin users no longer make a `supabase.rpc('is_admin')` call |
| `useAuth` sets `loading = false` before admin check | Pages render as soon as session is known, not after admin resolves |
| Supabase client window singleton | Prevents duplicate `GoTrueClient` instances across HMR reloads |
| Events two-layer cache (memory + localStorage, 10 min TTL) | Discover / Saved / EventDetail cost at most 1 DB fetch per session |
| Inbox data served from localStorage cache before network | Inbox appears instantly on return visits |
| Inbox data fetched in parallel (`Promise.all`) | Cuts wait time from sequential to max(slowest fetch) |
| `listReadItemKeysRemote()` runs after render (non-blocking) | Remote read-state sync never delays the inbox appearing |
| `WebNav` / `TabBar` use `NavLink` | Tab switching is instant client-side routing, not a full page reload |

---

## localStorage keys

| Key | Contents |
|---|---|
| `cultive:events-cache` | `{ data: Event[], fetchedAt: number }` — 10-min TTL |
| `cultive:saved-events` | `string[]` — saved event IDs |
| `cultive:read-messages` | `string[]` — read inbox message IDs |
| `cultive:submission-statuses` | `Record<submissionId, status>` — last known status for unread detection |
| `cultive:inbox-subs:{userId}` | Cached `Submission[]` for inbox |
| `cultive:inbox-txs:{userId}` | Cached `CreditTransaction[]` for inbox |
| `cultive:credit-balance:{userId}` | Cached credit balance (number) |
| `cultive:credit-tx:{userId}` | Cached transaction history |
| `cultive:referral-code:{userId}` | Cached referral code string |
| `cultive:saved-count-validated` | Last DB-validated saved event count |
| `cultive-auth` | Supabase session (managed by Supabase SDK, `storageKey` config) |
| `cultive-remember-me` | `'true'` / `'false'` — persists session preference |
