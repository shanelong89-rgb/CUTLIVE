# CULTIVE Frontend Build Plan — Jul 18-22

*Context for AI agents: cultive.city (Vite + React + React Router, Vercel). Supabase backend. 434 events live. Editorial voice: observational, precise, warm. Not hype. No em dashes. Primary CTA: "Text us on WhatsApp +852 5527 1026".*

---

## DAY 1 — Ongoing Events Tab + Category Filters

### 1. Ongoing Events Tab

Add a third tab to the date filter bar: `[Today] [This Weekend] [Ongoing]`

**Logic:**
```
Ongoing = events where date_end_iso exists AND (date_end_iso - today) > 7 days
Sorted by end date ASC (soonest ending first — creates urgency)
```

**Visual:** Quieter cards than "Today" tab. Smaller thumbnails or list view. Don't let galleries dominate the main feed.

**No DB changes needed.** Pure frontend filter on the existing `date_end_iso` field.

### 2. Category Filter Pills

Horizontal scrollable row of pills above the event grid:

```
[All] [Art] [Music] [Nightlife] [Food & Drink] [Market] [Workshop] [Wellness] [Community] [Film] [Sports] [Social] [Literature] [Fitness]
```

**Behavior:**
- Single select (tap one, previous deselects)
- Active pill = filled/accent color. Inactive = outlined.
- Mobile: horizontally scrollable, snap to start
- Works in combination with date tabs. Selecting "Art" + "This Weekend" = art events this weekend.

---

## DAY 2 — District + Price + Combined Filter Bar

### 3. District Filter

Dropdown or pill row below categories:

```
[All Areas] [Central] [Wan Chai] [Sheung Wan] [Tsim Sha Tsui] [Sai Ying Pun] [Sham Shui Po] [Kennedy Town] [Causeway Bay] [Wong Chuk Hang] [Kowloon] ...
```

**Behavior:** Single select. Combines with category + date filters.

**Data source:** Pull unique districts from `events.district` column. Don't hardcode.

### 4. Price Toggle

```
[All Prices] [Free] [Under $100] [Under $200]
```

**Logic:** Parse `events.price` — if it contains "Free" or "free", classify as free. If it starts with "HK$" or "$", parse the number for thresholds.

### 5. Date Selector

Expand existing date tabs:

```
[Today] [Tomorrow] [This Weekend] [This Week] [Pick a date 📅]
```

**Pick a date:** Opens a simple date picker. Shows events on that specific day (checking `date_iso` and `date_end_iso` for range overlap).

**Default view:** "All Dates" for first-time visitors, "This Weekend" for returning users.

### 6. Combined Filter Bar

All filters in one clean row. Mobile: collapse into dropdowns.

**Desktop:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Today ▼]  [All Categories ▼]  [All Areas ▼]  [💰 Free toggle] │
└─────────────────────────────────────────────────────────────┘
```

**Mobile:**
```
┌──────────────────────────────┐
│ [This Weekend ▼] [Filters 🔽] │
│ ← category pills scroll →    │
└──────────────────────────────┘
```

**Active filter count badge:** If user has 3 filters active, show a "(3)" badge.

---

## DAY 3 — Homepage + OG Tags + Link-in-Bio + Partnerships Fix

### 7. Homepage Hero

Replace or augment the current bare Discover page with a hero section at the top:

```html
<h1>Hong Kong culture. Curated by humans.</h1>
<p>Text us what you're in the mood for. We'll send you 3 picks.</p>
<a href="https://wa.me/85255271026">💬 Text us on WhatsApp</a>
```

Below the hero: the existing event grid (Discover page IS the homepage — just needs a header).

**For returning visitors:** Collapse the hero or show a smaller version. Don't make regulars scroll past it every time.

### 8. OG Tags Per Event (Critical)

Every event page currently shares as generic "CULTIVE | 文化活" with a favicon. Fix this.

**Approach A (best):** Vercel Edge Function that reads slug from URL, queries Supabase for event title + image, injects OG tags into HTML before serving.

**Approach B (quick):** Use React Helmet to set `document.title` and OG meta tags client-side. Works for WhatsApp unfurls (WhatsApp crawler executes JS).

OG tags needed per event page:
```html
<meta property="og:title" content="EVENT TITLE" />
<meta property="og:description" content="VENUE · DISTRICT · PRICE — via CULTIVE" />
<meta property="og:image" content="EVENT_FLYER_URL" />
<meta property="og:url" content="https://cultive.city/event/SLUG" />
<title>EVENT TITLE — CULTIVE</title>
```

### 9. Partnerships Page — Fix Hardcoded Zeros

Page shows "0 Events 0 Districts 0 Categories". Fix by querying Supabase:

```js
const { count: eventCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
const { data: districts } = await supabase.from('events').select('district');
const uniqueDistricts = [...new Set(districts.map(d => d.district).filter(Boolean))];
const { data: categories } = await supabase.from('events').select('category');
const uniqueCategories = [...new Set(categories.map(c => c.category).filter(Boolean))];
```

### 10. Link-in-Bio Page

New page at `cultive.city/link` — what people see when tapping the IG bio link.

Layout:
```
┌──────────────────────────┐
│     CULTIVE logo         │
│                          │
│  "Text us what you're    │
│   in the mood for."      │
│                          │
│  ┌────────────────────┐  │
│  │ 💬 Text on WhatsApp │  │
│  │  +852 5527 1026    │  │
│  └────────────────────┘  │
│                          │
│  This Weekend:           │
│  → Event 1               │
│  → Event 2               │
│  → Event 3               │
│                          │
│  📸 @cultive.city         │
│  🤝 /partnerships         │
└──────────────────────────┘
```

**Behavior:** WhatsApp button opens `https://wa.me/85255271026`. Weekend picks pulled from Supabase (upcoming events, limit 3-4). This page is purely a conversion funnel from IG → WhatsApp.

---

## DAY 4 — Event Detail + About Page + Mobile Audit

### 11. Save-to-WhatsApp Button

Add to every event detail page:
```
[💬 Save this event on WhatsApp]
```
Opens `https://wa.me/85255271026?text=save%20EVENT_SLUG` — pre-fills message. User hits send. Bot saves it.

### 12. "Get Directions" Button

Already partially exists (Google Maps link on venue). Make it more prominent — full-width button below venue info.

### 13. Share Button

Ensure share buttons use the fixed OG tags from Day 3 so shared event cards look good (flyer image, title, venue).

### 14. "More Like This" Section

Bottom of event detail pages. 3 related events:

```js
const related = events.filter(e => e.category === event.category && e.id !== event.id).slice(0, 3);
```

Simple cards. Same category, same district.

### 15. About Page

New page at `cultive.city/about`:

**Sections:**
1. **What CULTIVE is** — "A personal cultural concierge inside WhatsApp. We find what's worth going to in Hong Kong so you don't have to scroll."
2. **How it works** — "Text us what you're into. We send 3 curated picks. You go out."
3. **The numbers** — 434 events. 49 districts. 14 categories. Every one reviewed by a real person.
4. **The team** — Shane, Eugene, Andy, William. Brief 1-2 line bios.
5. **Contact** — connect@cultive.city / WhatsApp +852 5527 1026

**Voice:** Editorial-minimal. Not corporate. Not hype. "We go out so you don't waste your night."

### 16. Mobile Experience Audit

Go through every page on a 375px viewport:

| Check | What to fix |
|-------|-------------|
| Event cards | Tappable. Clear hierarchy. Thumbnails load fast. |
| Filter pills | Horizontally scrollable. Not wrapping. Not cut off. |
| Font sizes | 16px minimum for body. Headers scale down. |
| Tap targets | ≥ 44px. No overlapping buttons. |
| WhatsApp links | Open WhatsApp app directly. Not browser. |
| Page load | Under 3 seconds on 4G. |
| Images | Compress event flyers. Lazy load below the fold. |
| Tab bar | Has `padding-bottom: 100px` on mobile so content isn't hidden. |

**Fix any issues found.** The mobile experience IS the product.

---

## BONUS (if time permits)

### 17. Event Submission Form

Public form at `cultive.city/submit` (consider making public with moderation queue):
- Fields: title, date, end date, time, venue, category, district, price, description, image upload
- On submit → inserts into `submissions` table with status `pending`

### 18. Skeleton Loading States

Replace "Loading events..." text with gray skeleton cards matching event card shape.

---

## Build Order & Dependencies

```
Day 1:  Ongoing tab → Category pills
Day 2:  District filter → Price toggle → Date picker → Combined bar
Day 3:  Homepage hero → OG tags → Fix partnerships zeros → Link-in-bio page
Day 4:  Save-to-WhatsApp → Get directions → Related events → About page → Mobile audit
```

- Nothing blocks anything else. All can be built independently.
- OG tags make the share button (Day 4 #13) actually useful.
- Category pills (Day 1) are used by the combined filter bar (Day 2).

---

## Supabase Reference

```sql
-- Key columns for filtering:
date_iso       -- DATE type. For date-based queries. "2026-07-16"
date_end_iso   -- DATE type. For multi-day/ongoing checks. "2026-07-20"
category       -- TEXT. Single string: "music", "art", "nightlife", etc.
district       -- TEXT. "Central", "Wan Chai", "Sheung Wan", etc.
price          -- TEXT. "Free", "HK$200", etc.
venue          -- TEXT. Venue name only.
tags           -- TEXT[]. PostgreSQL array. Filter with cs (contains).
image          -- TEXT. Permanent image URL.
slug           -- TEXT. URL-safe identifier.
```

**Supabase filter examples:**
```js
// Ongoing events
.gte('date_end_iso', todayISO).gt('date_end_iso', sevenDaysFromNow)

// Category filter
.eq('category', 'music')

// District filter
.eq('district', 'Central')

// Combined
.eq('category', 'art').eq('district', 'Central').gte('date_iso', weekendStart)

// Multi-day range overlap (event spans the filter window)
.or(`date_end_iso.gte.${filterStart},and(date_end_iso.is.null,date_iso.gte.${filterStart})`)
```

---

## WhatsApp Integration Points

| Page | WhatsApp Action |
|------|----------------|
| Homepage hero | "Text us on WhatsApp" → wa.me/85255271026 |
| Link-in-bio | "Text us on WhatsApp" → wa.me/85255271026 |
| Event detail | "Save this event" → wa.me/85255271026?text=save%20SLUG |
| Footer (all pages) | WhatsApp number visible |
| Partnerships page | "Let's talk" → wa.me link or email |
