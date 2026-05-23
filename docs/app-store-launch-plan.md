# CULTIVE — App Store Launch Plan

Everything needed to get the mobile app into the App Store / Play Store, properly connected to cultive.city, with web and mobile fully cohesive.

---

## What's already working

- Web app is live and deployed at cultive.city (via Vercel)
- Web and mobile both point to the same Supabase project (`qmjdqldmpmeguuyepbsw`)
- Auth, saved events, submissions, inbox, and push notifications are all shared via the same DB
- Sessions persist across app restarts (AsyncStorage)
- Admin email fixed in mobile to match web: `shanelong89@gmail.com`
- expo-router origin updated to `https://cultive.city`

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

Use `city.cultive.app` — it mirrors your domain in reverse (standard convention). Or any other identifier you want, as long as it's consistent across iOS and Android and not already taken on the App Store.

---

## Step 2 — Set up EAS (Expo Application Services)

EAS is the official way to build and submit Expo apps to the stores. Without it you cannot submit to the App Store or Play Store.

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

The mobile app reads Supabase credentials from env vars. For EAS builds these must be set in the EAS dashboard, not in a `.env` file (which is git-ignored and not included in builds).

**Go to**: expo.dev → your project → Secrets → Add

Set these two secrets:
```
EXPO_PUBLIC_SUPABASE_URL       = https://qmjdqldmpmeguuyepbsw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY  = <your anon key from Supabase dashboard>
```

Find the anon key: Supabase Dashboard → Project Settings → API → `anon` `public` key.

---

## Step 4 — Universal Links (cultive.city URLs open the app)

This lets links like `cultive.city/event/abc123` open directly in the installed app instead of the browser.

### 4a — Add the AASA file to your web domain

On your Vercel project (the cultive.city web app), add a file at exactly this path:
```
public/.well-known/apple-app-site-association
```

Content (replace `TEAMID` with your Apple Team ID from developer.apple.com):
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.city.cultive.app",
        "paths": ["*"]
      }
    ]
  },
  "webcredentials": {
    "apps": ["TEAMID.city.cultive.app"]
  }
}
```

Vercel will serve it at `https://cultive.city/.well-known/apple-app-site-association` — Apple requires this to be accessible without a redirect.

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
The SHA256 fingerprint comes from your EAS build keystore — EAS generates it for you. You can get it after your first production build with:
```bash
eas credentials
```

---

## Step 5 — Apple Developer & Google Play accounts

You need paid accounts to submit:
- **Apple**: developer.apple.com — $99/year. Gives you a Team ID and lets you submit to the App Store.
- **Google**: play.google.com/console — one-time $25. Lets you submit to the Play Store.

Once you have these, add your Apple Team ID to `app.json`:
```json
"ios": {
  "appleTeamId": "YOURTEAMID"
}
```

---

## Step 6 — Build and submit

After EAS is configured and accounts are set up:

```bash
# iOS production build (submits to App Store Connect)
eas build --platform ios --profile production
eas submit --platform ios

# Android production build (submits to Play Store)
eas build --platform android --profile production
eas submit --platform android
```

---

## Step 7 — Cohesion checklist (web ↔ mobile)

These are already wired correctly — just confirm before launch:

| Feature | Web | Mobile | Status |
|---|---|---|---|
| Supabase project | `qmjdqldmpmeguuyepbsw` | `qmjdqldmpmeguuyepbsw` | Same ✓ |
| Auth provider | Supabase email/password | Supabase email/password | Same ✓ |
| Session storage | localStorage | AsyncStorage | Platform-appropriate ✓ |
| Saved events sync | `saved_events` table | `saved_events` table | Same ✓ |
| Submission flow | `submissions` table, status enum | `submissions` table, status enum | Same ✓ |
| Inbox (read state) | `user_read_items` table | `user_read_items` table | Same ✓ |
| Push notifications | n/a (web) | Expo Push via `push_tokens` table | Mobile-only, correct ✓ |
| Admin email | `shanelong89@gmail.com` | `shanelong89@gmail.com` | Fixed ✓ |
| expo-router origin | n/a | `https://cultive.city` | Fixed ✓ |

### One thing to check manually

On web, sign in and confirm events, submissions, and inbox all load. Then sign in with the **same account** on mobile and confirm:
- Saved events match
- Inbox shows the same submissions
- Submission count on the account screen matches

If they match, the backend is fully cohesive.

---

## Summary — order of operations

1. Update bundle ID in `app.json` to `city.cultive.app`
2. Create your Apple Developer account (if you don't have one)
3. Get your Apple Team ID, add it to `app.json`
4. Run `eas build:configure` to generate `eas.json`
5. Add Supabase env vars to EAS secrets
6. Add the AASA file to your Vercel web project for Universal Links
7. Run your first EAS production build
8. Get the Android signing SHA256 from `eas credentials`, add to `assetlinks.json`
9. Submit to App Store Connect and Play Store via `eas submit`
