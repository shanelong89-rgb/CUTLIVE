# CULTIVE — App Store Launch Plan

Everything needed to get the mobile app into the App Store / Play Store, properly connected to cultive.city, with web and mobile fully cohesive.

---

## What's already working

### Core infrastructure
- Web app is live at cultive.city (Vercel)
- Web and mobile both point to the same Supabase project (`qmjdqldmpmeguuyepbsw`)
- Auth, saved events, submissions, inbox, and push notifications share the same DB
- Sessions persist across app restarts (AsyncStorage)
- Admin emails fixed to match web: `shanelong89@gmail.com`, `shanelong@gmail.com`
- `expo-router` origin set to `https://cultive.city`

### Events & discovery
- Events list with search and tag/category filtering
- Event detail screen (title, description, venue, date, time, price, photo)
- Saved events with full cloud sync (`saved_events` table, real-time on mobile)
- In-memory events cache + React Query `staleTime: 5min` — reduces Supabase reads on every tab switch

### Inbox
All four card types are working on both web and mobile:
- **Submission pending** — shows when a submission is awaiting review
- **Submission approved** — unread badge reappears when status changes; links to event
- **Submission rejected** — with reason; links to My Submissions
- **Saved event reminders** — four escalating states:
  - "Reminder: [title]" — generic upcoming (days away)
  - "Tomorrow: [title]" — with time, venue, price + Maps link
  - "Starting in Xh: [title]" — within 2 hours, with Maps link
  - "Happening now: [title]" — single-day event, with Maps link
  - "On now: [title] · Nd left" — multi-day exhibitions/markets, shows hours + venue + days remaining
- Date parsing handles all formats: ISO (`2026-05-23`), month-name (`May 8, 2026`), range (`May 8–27, 2026`), relative (`today`, `tomorrow`), and weekday-prefixed (`Fri 13 Jun`)
- Multi-day events use `date_end` so they stay visible for the full run, not just 14 days after start
- Self-triggered `load()` loop suppressed via 3s cooldown on `user_read_items` realtime events
- Push notification deep-link handler wired in `_layout.tsx` — tapping a push opens the right inbox card

### Submissions
- Submit screen with image upload to Supabase Storage (`submission-images` bucket, public)
- My Submissions screen — lists all user submissions with status badges (pending / approved / rejected)
- Submission count on Account screen reflects actual count by session email

### Admin
- Admin screen accessible to admin emails only
- Can approve / reject submissions from mobile

---

## What's still to do before App Store

### Code / functionality
- [ ] **Cross-app inbox read/unread sync** — when a user marks all read on web, it should propagate to mobile on next refresh (and vice versa). Currently, `user_read_items` deletions (un-reads from status changes) aren't pushed to Supabase, so after a status flip the "unread" state can drift between devices. Fix: `deleteReadItemsRemote` helper + port status-change unread logic to web hook.
- [ ] **Auto-fill submitter email/name** on mobile submit form — pre-populate from active Supabase session so submission count is always tied to the right account.

### App Store setup
- [x] **Bundle ID updated** — `app.json` now uses `city.cultive.app` for both iOS and Android
- [x] **`associatedDomains` added** to iOS section in `app.json` (applinks + webcredentials)
- [x] **Android `intentFilters`** added for App Links to `app.json`
- [x] **AASA file created** — `public/.well-known/apple-app-site-association` (Team ID `QU9S49M4Y6`)
- [x] **`assetlinks.json` created** — `public/.well-known/assetlinks.json` (SHA256 placeholder — fill in after first EAS build)
- [x] **`vercel.json` created** — serves both well-known files with correct `Content-Type: application/json`
- [x] **`eas.json` created** — EAS build profiles (development / preview / production)
- [ ] **EAS login** — `npm install -g eas-cli && eas login` (your terminal)
- [ ] **Link to Expo project** — `cd artifacts/cultive-mobile && eas init` or `eas build:configure` (your terminal)
- [ ] **EAS secrets** — add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in expo.dev dashboard
- [ ] **Deploy Vercel update** — push/deploy so `cultive.city/.well-known/apple-app-site-association` is live
- [ ] **First EAS production build** — `eas build --platform ios --profile production`
- [ ] **Android SHA256** — run `eas credentials` after first build, copy fingerprint into `assetlinks.json`, redeploy Vercel
- [ ] **Submit** — `eas submit --platform ios` / `eas submit --platform android`

---

## Step 1 — Fix bundle identifiers (do this first)

The current bundle IDs are placeholders (`com.replit.cultivemobile`). Before submitting to any store you need real ones.

**In `app.json`, update:**
```json
"ios": {
  "bundleIdentifier": "city.cultive.app"
},
"android": {
  "package": "city.cultive.app"
}
```

Use `city.cultive.app` — mirrors your domain in reverse (standard convention).

---

## Step 2 — Set up EAS (Expo Application Services)

EAS is the official way to build and submit Expo apps to the stores.

**Run once in your terminal:**
```bash
npm install -g eas-cli
eas login          # log in with your Expo account (expo.dev)
cd artifacts/cultive-mobile
eas build:configure   # creates eas.json
```

**The `eas.json` it creates should look like this:**
```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

---

## Step 3 — Environment variables for production builds

The mobile app reads Supabase credentials from env vars. For EAS builds these must be set in the EAS dashboard, not in a `.env` file.

**Go to**: expo.dev → your project → Secrets → Add

```
EXPO_PUBLIC_SUPABASE_URL       = https://qmjdqldmpmeguuyepbsw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY  = <your anon key from Supabase dashboard>
```

---

## Step 4 — Universal Links (cultive.city URLs open the app)

This lets links like `cultive.city/event/abc123` open directly in the installed app instead of the browser.

### 4a — Add the AASA file to your web domain

On your Vercel project, add a file at exactly this path:
```
public/.well-known/apple-app-site-association
```

Content:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "QU9S49M4Y6.city.cultive.app",
        "paths": ["*"]
      }
    ]
  },
  "webcredentials": {
    "apps": ["QU9S49M4Y6.city.cultive.app"]
  }
}
```

### 4b — Enable Associated Domains in app.json

```json
"ios": {
  "bundleIdentifier": "city.cultive.app",
  "associatedDomains": ["applinks:cultive.city", "webcredentials:cultive.city"]
}
```

### 4c — Android App Links

Create `public/.well-known/assetlinks.json` on your web domain:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "city.cultive.app",
    "sha256_cert_fingerprints": ["<YOUR_SIGNING_KEY_SHA256>"]
  }
}]
```
The SHA256 fingerprint comes from your EAS build keystore — get it after your first production build with `eas credentials`.

---

## Step 5 — Apple Developer & Google Play accounts

- **Apple** ✓ — Account active. Credentials on file:
  - Team ID: `QU9S49M4Y6`
  - Developer ID: `c2388d89-44db-427a-aea3-7d2e58225073`
  - `appleTeamId` already added to `app.json`
- **Google** — play.google.com/console, one-time $25 fee if not already set up.

---

## Step 6 — Build and submit

```bash
# iOS production build + submit to App Store Connect
eas build --platform ios --profile production
eas submit --platform ios

# Android production build + submit to Play Store
eas build --platform android --profile production
eas submit --platform android
```

---

## Step 7 — Cohesion checklist (web ↔ mobile)

| Feature | Web | Mobile | Status |
|---|---|---|---|
| Supabase project | `qmjdqldmpmeguuyepbsw` | `qmjdqldmpmeguuyepbsw` | Same ✓ |
| Auth provider | Supabase email/password | Supabase email/password | Same ✓ |
| Session storage | localStorage | AsyncStorage | Platform-appropriate ✓ |
| Saved events sync | `saved_events` table | `saved_events` table | Same ✓ |
| Events cache | 2-layer (in-memory + localStorage, 10min TTL) | In-memory + React Query 5min staleTime | Platform-appropriate ✓ |
| Submission flow | `submissions` table, status enum | `submissions` table, status enum | Same ✓ |
| My Submissions screen | `/my-submissions` page | `app/my-submissions.tsx` | Both ✓ |
| Inbox — submission cards | Pending / Approved / Rejected | Pending / Approved / Rejected | Same ✓ |
| Inbox — saved reminders | All 5 types (generic, tomorrow, soon, now, multi-day) | All 5 types | Same ✓ |
| Inbox — Maps links | Tomorrow + now/soon cards | Tomorrow + now/soon cards | Same ✓ |
| Inbox — read state | `user_read_items` table + localStorage | `user_read_items` table + AsyncStorage | Same ✓ |
| Inbox — self-loop fix | 3s cooldown on realtime write events | 3s cooldown on realtime write events | Same ✓ |
| Push notifications | n/a (web) | Expo Push via `push_tokens` table | Mobile-only ✓ |
| Push deep-link | n/a | Handled in `_layout.tsx` | Mobile-only ✓ |
| Admin access | Admin page (`/admin`) | Admin screen (`app/admin.tsx`) | Both ✓ |

### Cross-device check (do before launch)

Sign in on web → confirm events, submissions, and inbox load. Then sign in with the **same account** on mobile and confirm:
- Saved events match
- Inbox shows the same submissions with same read state
- Submission count on Account screen matches

---

## Summary — order of operations

1. Fix remaining code items: cross-app inbox read sync, auto-fill submit email
2. Update bundle ID in `app.json` → `city.cultive.app` (still `com.replit.cultivemobile`)
3. ~~Create Apple Developer account~~ ✓ Done — Team ID `QU9S49M4Y6`
4. ~~Add `appleTeamId` to `app.json`~~ ✓ Done
5. Run `eas build:configure` to generate `eas.json`
6. Add Supabase env vars to EAS secrets (expo.dev dashboard)
7. Add the AASA file to Vercel project for Universal Links
8. Run first EAS production build
9. Get Android signing SHA256 from `eas credentials`, add to `assetlinks.json`
10. Submit to App Store Connect and Play Store via `eas submit`
