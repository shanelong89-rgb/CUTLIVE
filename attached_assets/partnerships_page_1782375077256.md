{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww22980\viewh20460\viewkind0
\pard\tx566\tx1133\tx1700\tx2267\tx2834\tx3401\tx3968\tx4535\tx5102\tx5669\tx6236\tx6803\pardirnatural\partightenfactor0

\f0\fs24 \cf0 <details type="reasoning" done="true" collapsible="true" duration="0">\
<summary>Finished thinking</summary>\
\
The user wants to take the interactive HTML page we built and recreate it exactly on Replit as a new page on their site. They want me to write a detailed prompt they can give to Replit to build this 1:1.\
\
Let me create a comprehensive prompt that covers everything - all the sections, fonts, colors, animations, images, canvas elements, etc.\
</details>\
\
Here's the exact prompt to give Replit:\
\
---\
\
**Build a new page at `/partnerships` that is a single-page interactive brand deck for CULTIVE. Copy every detail below exactly \'97 no interpretation, no shortcuts.**\
\
---\
\
## TECH STACK\
- Single HTML page with inline CSS + vanilla JS (no frameworks needed for this page)\
- Google Fonts: `Archivo Black` (900) and `Inter` (400, 500, 600, 700)\
- Three.js r128 via CDN for 3D cube section\
- GSAP 3.12.5 via CDN for logo animation\
- Canvas API for floating cards + radial carousel + logo animation\
\
## BRAND COLORS (exact hex, no approximations)\
```\
--white: #ffffff\
--text-primary: #030213    (headlines, titles, stats)\
--text-body: #4a4a5a       (body copy, bullets)\
--text-meta: #717182        (section labels, examples)\
--divider: rgba(0,0,0,0.1)  (1px hairlines)\
--divider-thick: rgba(0,0,0,0.2) (section separators)\
```\
\
## TYPOGRAPHY (exact specs)\
```\
Logo / Cover:     Archivo Black, 110pt, weight 900, tracking -0.03em, color #030213\
Page title (h1):  Archivo Black, 28pt, weight 900, tracking -0.03em, color #030213\
Section head (h2): Archivo Black, 16pt, weight 900, tracking -0.02em, color #030213\
Section label:    Inter, 9pt, weight 700, tracking +0.18em, color #717182, uppercase\
Body:             Inter, 11pt, weight 400, color #4a4a5a\
Bullet:           Inter, 11pt, weight 400, color #4a4a5a\
Stat number:      Archivo Black, 22pt, weight 900, tracking -0.02em, color #030213\
Stat label:       Inter, 8pt, weight 700, tracking +0.12em, color #717182, uppercase\
Pullquote:        Inter, 13pt, weight 500, color #030213, border-left 3px solid #030213, padding-left 20px\
Contact email:    Archivo Black, 16pt, weight 900, color #030213\
Contact web:      Inter, 12pt, weight 400, color #4a4a5a\
Closing brand:    Archivo Black, 14pt, weight 900, color #030213\
Closing tagline:  Inter, 10pt, weight 400, color #717182\
```\
\
## LAYOUT RULES\
- No images/photos as decorative elements. Everything is text + hairline borders + whitespace.\
- Section rhythm: 22px after h1, 8px after h2, 10px between paragraphs\
- Divider: 1px, rgba(0,0,0,0.1)\
- Thick divider: 1px, rgba(0,0,0,0.2)\
- Cover line: 60px wide, 2px tall, #030213\
- Even sections get background #fafafa (except dark sections)\
- Max content width: 680px, centered\
\
## PAGE STRUCTURE (7 sections, in order)\
\
### SECTION 0 \'97 COVER\
- Full viewport height, centered\
- Animated logo on a canvas (800\'d7200, high DPI):\
  - "CULTIVE" scales in with bounce ease (GSAP `back.out(1.5)`), 110px Archivo Black #030213\
  - After 0.5s pause, CULTIVE shrinks to 55% and shifts left\
  - "Your cultural connector" slides in next to it, Inter 500, ~27px, #4a4a5a, NOT italic\
  - Plays once, then stays visible\
  - Parallax: shifts up + scales down + fades as user scrolls past the cover\
- No "Brand Partnership Introduction \'b7 2026" text\
\
### SECTION 1 \'97 THE PROBLEM + THE PRODUCT\
- White background\
- Section label: "The Problem"\
- H1: "You keep finding out too late."\
- Body paragraphs about timing problem\
- Pullquote: "I would've gone if I'd known." \'97 everyone, every week\
- Thick divider\
- Section label: "The Product"\
- H1: "A WhatsApp friend who already went."\
- Body about WhatsApp not being an app\
- Label: "It works like this" (uppercase, #717182, 10pt)\
- **WhatsApp phone mockup** (inline CSS, no images):\
  - Rounded frame (32px radius), drop shadow\
  - Green header (#075E54) with "C" avatar (green circle, white Archivo Black "C"), "CULTIVE" name, "online" status\
  - Chat wallpaper: #E5DDD5 with subtle dot pattern (CSS radial-gradient)\
  - "Today" date chip (blue-grey #E1F2FB)\
  - Messages animate in sequentially when scrolled into view (IntersectionObserver):\
    1. You (green outgoing #DCF8C6, right-aligned, blue double-check SVG marks): "what's good this weekend" \'97 6:14 PM\
    2. CULTIVE (white incoming #FFFFFF, left-aligned, tail triangle): "There's a ceramic exhibition in Wong Chuk Hang that closes Sunday. The artist spent 6 months working with local clay. Free entry. Opens 11." \'97 6:14 PM\
    3. You: "need a booking?" \'97 6:15 PM\
    4. CULTIVE: "Walk-in. If you go Saturday there's a kiln demo at 3." \'97 6:15 PM\
  - Typing indicator (3 animated dots) shows before first message and after last message\
  - Composer bar at bottom (grey #F0F2F5, rounded input, SVG mic button green #25D366)\
  - NO emojis anywhere \'97 use SVG icons and text symbols only\
- Body: "That's the whole product..."\
- Bold: "No app download. No sign-up. Just a contact in your phone."\
\
### SECTION 2 \'97 WHO THIS IS FOR\
- White background\
- Section label: "Who This Is For"\
- H1: "You're the person who needs this if\'85"\
- 5 recognition cards (stagger-animate in), each with bold lead + description:\
  1. "You just moved here." \'97 don't know neighbourhoods...\
  2. "You've been here 5 years." \'97 tired of same 3 bars...\
  3. "You found out about something good too late" \'97 at least once last month...\
  4. "You want to support local" \'97 don't know what's real...\
  5. "You'd rather text one person" \'97 than scroll Instagram 20 min...\
- Body: "CULTIVE is for people who go out 2\'964 times a month \'97 or want to. They're 25\'9640. They're tired of algorithms and newsletters. They want someone to just tell them."\
\
### SECTION 3 \'97 WHAT WE'VE DONE + WHY THEY TRUST US\
- **Floating cards canvas background** (full-width canvas, transparent overlay)\
  - 7 cards using these event photo URLs (same images as the 3D cube):\
    ```\
    https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/95ff3b6bf_images_0_mq6q4waq.jpg\
    https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/3338e66d1_images_1_mq6q4wat.jpg\
    https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/8db4ee27e_images_2_mq6q4wau.jpg\
    https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/daa7420de_images_3_mq6q4wav.jpg\
    https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/bc642a903_images_4_mq6q4wax.jpg\
    https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/925399de3_images_5_mq6q4wb1.jpg\
    https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/a1596dcd2_images_6_mq6q4wb1.jpg\
    https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/b116c410b_images_7_mq6q4wbc.jpg\
    https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/11cd1f168_images_8_mq6q4wbd.jpg\
    https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/20b1b8cf7_images_9_mq6q4wbe.jpg\
    https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/8a7ee390e_images_10_mq6q4wbr.jpg\
    https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/6c6fe4ffd_images_11_mq6q4wbr.jpg\
    ```\
  - Cards stacked in diagonal fan formation (spacing 100px, direction x:-0.03 y:-0.03)\
  - Swirl rotation: 0.14 radians per card\
  - Aspect ratio: 0.7 (portrait)\
  - Corner radius: 10px\
  - White card bodies (#ffffff), drop shadows, event photos cover each card\
  - **Animation**: smooth sine wave loop `(Math.sin(time - stagger * Math.PI) + 1) / 2` with stagger `i * 0.15`\
  - Cards slide up from bottom one by one, hold, slide back down\
  - When all cards are at bottom (sine near 0 for first, middle, and last card, threshold 0.05), pause 10 seconds (empty canvas), then resume\
  - Subtle idle breathing: `Math.sin(now * 0.001 + i * 0.5) * 5` on x, `Math.cos(now * 0.0008 + i * 0.3) * 5` on y\
  - Scroll parallax: whole stack shifts vertically with scroll, back cards move more than front\
  - Only starts when section scrolls into view (IntersectionObserver threshold 0.3)\
  - 0% overlay \'97 cards fully visible\
- **Text overlaid on top** (dark text, no background):\
  - Section label: "What We've Done" (color: rgba(3,2,19,0.5))\
  - H2\
...(truncated)...\
\
\
\uc0\u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \
EXACT COPY TEXT\
\uc0\u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \
\
SECTION 1 \'97 THE PROBLEM\
Label: THE PROBLEM\
h1: You keep finding out too late.\
Body:\
"You scroll Instagram on Friday afternoon. You see friends at an exhibition that opened Tuesday. A pop-up dinner that happened Wednesday. A screening that was Thursday."\
"You were home. The group chat went quiet. You ended up at the same bar."\
"That's not a discovery problem. You have apps for discovery. It's a timing problem. You hear about the good things after they happened."\
Pullquote: "I would've gone if I'd known." \'97 everyone, every week\
\
SECTION 1 \'97 THE PRODUCT\
Label: THE PRODUCT\
h1: A WhatsApp friend who already went.\
Body:\
"Not a platform. Not an app. Not a newsletter you'll delete. A person inside WhatsApp who already looked, already went, and can tell you what's worth your Friday night \'97 before it happens."\
Label: It works like this\
[WhatsApp chat mockup here]\
"That's the whole product. A person who already looked it up. You save the 45 minutes of scrolling and the regret of finding out late."\
Bold: "No app download. No sign-up. Just a contact in your phone."\
\
SECTION 2 \'97 WHO THIS IS FOR\
Label: WHO THIS IS FOR\
h1: You're the person who needs this if\'85\
Cards:\
1. "You just moved here. You don't know which neighbourhoods have the good stuff. Everyone you ask says 'follow these accounts' \'97 but that's 50 accounts, not an answer."\
2. "You've been here 5 years. You're tired of the same 3 bars. You know there's more happening \'97 you just don't know where."\
3. "You found out about something good too late \'97 at least once in the last month."\
4. "You want to support local but don't know what's real and what's just well-marketed."\
5. "You'd rather text one person than scroll Instagram for 20 minutes hoping something catches your eye."\
Body: "CULTIVE is for people who go out 2\'964 times a month \'97 or want to. They're 25\'9640. They're tired of algorithms and newsletters. They want someone to just tell them."\
\
SECTION 3 \'97 STATS + TRUST\
Label: WHAT WE'VE DONE\
h2: Already building the map.\
Stats:\
- 254 / EVENTS REVIEWED\
- 50 / DISTRICTS\
- 21 / CATEGORIES\
- 10 / PEOPLE TEXTING\
Body: "254 events, every one checked by a real person. 50 districts across HK. 21 categories \'97 from ceramic kiln demos to midnight jazz sets. 10 people already texting us for their Friday plans."\
\
Label: WHY THEY TRUST US\
h2: Not an algorithm. A person who goes out.\
Trust list:\
- "We don't accept payment to recommend something. If it's in our list, someone went and it was worth it."\
- "We tell you when something's actually free vs 'free with purchase.'"\
- "If we haven't been there yet, we say so. 'Haven't checked this one yet \'97 the menu looks good though.'"\
- "We remember what you like. Text us 'more art shows' and the next rec will be art."\
\
SECTION 4 \'97 PARTNERSHIPS\
Label: WHY BRANDS WORK WITH US\
h1: When we recommend you, someone walks in that night.\
Body:\
"Here's the mechanism. It's simple:"\
"Someone texts us 'looking for a drink spot in Sheung Wan.' We mention your cocktail bar \'97 with a specific reason. They walk in that night, already knowing your story. They're not scrolling for 20 minutes and ending up at wherever's loudest. They arrived with intent."\
Pullquote: "An ad reaches someone on the couch. A CULTIVE recommendation reaches someone who's already looking for a plan."\
\
h2: Partnership Opportunities\
[Radial carousel cards]\
\
Card 1 \'97 Curated Placement\
Title: Curated Placement\
Desc: "Your venue gets recommended inside the WhatsApp conversation. Not as a listing \'97 as a specific reason to go there tonight."\
Example: "There's a new cocktail bar in Sheung Wan. The team behind it used to run [notable spot]. The negroni is worth the trip."\
\
Card 2 \'97 Insider Access\
Title: Insider Access\
Desc: "CULTIVE members get a small but meaningful upgrade at your venue. A welcome drink. Priority booking. Something that makes the WhatsApp message feel like a secret worth having."\
Example: "Show this message for a welcome drink."\
\
Card 3 \'97 Cultural Trails\
Title: Cultural Trails\
Desc: "Your venue becomes part of a multi-stop itinerary. Dim sum in the morning. Your gallery in the afternoon. Live music at night. The person gets a full day's plan, not a single pin on a map."\
\
Card 4 \'97 Co-Branded Evenings\
Title: Co-Branded Evenings\
Desc: "We curate and host an event together. Your brand gets associated with culture. We handle the curation, the audience, and the experience. You get the right people in the room."\
\
h2: Why a CULTIVE Recommendation Matters\
Why list:\
- "Your venue gets mentioned to someone who is actively looking for a plan \'97 not passively scrolling"\
- "The recommendation comes with context (your story, not just your name)"\
- "The person arrives already interested, not cold"\
- "No banner ads. No 'featured' tags. Just a real recommendation from a trusted source"\
- "We can measure how many people we sent your way through WhatsApp interactions"\
- "You're part of the city's cultural fabric, not a sponsored placement"\
\
SECTION 5 \'97 EVENTS\
Label: FROM OUR SOCIALS\
h1: Every event. Real coverage.\
Body: "254 events reviewed across 50 districts. We don't list \'97 we attend. Every photo below is a real event we covered in Hong Kong."\
[3D Three.js cube]\
\
SECTION 6 \'97 NEXT STEPS\
Label: NEXT STEPS\
h1: Let's start with one event.\
Body:\
"We have 254 events in our database from 50 districts. Every one checked by a real person. When someone texts us 'what's good,' we give them a real answer \'97 not a search result, an opinion."\
"We're not asking for a long-term commitment. Let's try one recommendation. We feature your venue, you see who walks in, and we decide what's next from there."\
Pullquote: "If your brand is part of what makes Hong Kong worth going out for \'97 let's talk."\
\
Contact:\
connect@cultive.city\
www.cultive.city\
\
Quick Facts:\
- How it works: Text us on WhatsApp. We send 3 curated picks. You go out.\
- Who's behind it: Real people in HK who actually attend these events\
- Market: Hong Kong\
- Instagram reach: 6,000+ accounts/week (organic)\
- Pricing: Free for users \'b7 Partnership pricing case-by-case.\
\
Closing:\
CULTIVE\
Your cultural connector\
\
\uc0\u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \
IMAGE URLS (use exactly)\
\uc0\u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \u9552 \
\
Event photos (for floating cards + 3D cube, 41 images):\
https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/95ff3b6bf_images_0_mq6q4waq.jpg\
https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/3338e66d1_images_1_mq6q4wat.jpg\
https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/8db4ee27e_images_2_mq6q4wau.jpg\
https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/daa7420de_images_3_mq6q4wav.jpg\
https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/bc642a903_images_4_mq6q4wax.jpg\
https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/925399de3_images_5_mq6q4wb1.jpg\
https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/a1596dcd2_images_6_mq6q4wb1.jpg\
https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/b116c410b_images_7_mq6q4wbc.jpg\
https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/11cd1f168_images_8_mq6q4wbd.jpg\
https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/20b1b8cf7_images_9_mq6q4wbe.jpg\
https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/8a7ee390e_images_10_mq6q4wbr.jpg\
https://base44.app/api/apps/69cbcd44d3da2a5cef013f5e/files/mp/public/69cbcd44d3da2a5cef013f5e/6c6fe4ffd_images_11_mq6q4wbr.jpg\
(and so on through images_40)\
\
Partnership card images (4 images):\
...(truncated)...}