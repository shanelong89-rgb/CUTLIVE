# CULTIVE Beta Launch Plan
**Target Launch: June 15, 2026** (3 weeks from now)

---

## 1. CURRENT STATE ASSESSMENT

### ✅ What's Working (Keep)
| Feature | Status | Notes |
|---------|--------|-------|
| Event Discovery | ✅ Live | Shows date + time, filters working |
| Admin CMS | ✅ Live | /admin password protected, CRUD working |
| Event Submissions | ✅ Live | Form at /submit, stores to localStorage |
| Basic UI/UX | ✅ Live | Editorial grid, responsive, brand solid |
| Mock Events | ✅ | 14 events showing, good for demo |

### ❌ What's Broken/Missing (Fix Before Launch)
| Feature | Priority | Issue |
|---------|----------|-------|
| User Accounts | CRITICAL | No real auth, just modal placeholder |
| Email System | CRITICAL | No email capture or notifications |
| Ticketing | HIGH | Currently placeholder/no flow |
| Supabase Integration | HIGH | Using mock data, real DB not connected |
| Payment (Curators) | MEDIUM | $50 HKD approval payment not wired |
| Member Subscriptions | MEDIUM | $99/month exclusive access not working |

---

## 2. BETA SCOPE (MVP)

### What "Beta" Means
- **10-15 curated curators** invited personally
- **Email-based ticketing** (no Stripe yet - keep it simple)
- **Waitlist for memberships** (collect emails, manual approval)
- **Manual payments** for curators (PayMe/FPS, track in admin)

### Core User Flows to Work

#### A. Event Discovery (DONE ✅)
```
User → Landing Page → Browse Events → View Details
```

#### B. Curator Submission (NEEDS WORK ⚠️)
```
Curator → /submit → Form → Admin Queue → Approval → $50 HKD payout
```
**Fixes needed:**
- Connect to real Supabase (not localStorage)
- Email notification on approval
- Payment method field in form (PayMe/FPS number)

#### C. User Ticketing (SIMPLIFIED 🎯)
```
User → Click "Get Tickets" → Email RSVP Form → Confirmation Email
```
**For Beta:** Skip Stripe. Just email collection + manual confirmation.

#### D. Member Signup (WAITLIST MODE 📋)
```
User → Click "Join" → Email capture → "We'll contact you soon"
```
**For Beta:** Collect emails, manually onboard first 50 members.

---

## 3. TECHNICAL TODOS (With Owners)

### Week 1 (May 20-26): Foundation
| Task | Owner | Hours | Due |
|------|-------|-------|-----|
| Connect Supabase real DB | You | 3 | May 22 |
| Set up Resend/Postmark email | You | 2 | May 23 |
| Build email capture system | You | 4 | May 24 |
| Fix submission → Supabase | You | 3 | May 25 |
| Test curator flow end-to-end | You | 2 | May 26 |

### Week 2 (May 27-June 2): Ticketing & Accounts
| Task | Owner | Hours | Due |
|------|-------|-------|-----|
| Email RSVP form for events | You | 4 | May 29 |
| Confirmation email template | You | 2 | May 30 |
| Curator approval email | You | 2 | May 31 |
| Admin: Approve → send email | You | 3 | June 1 |
| Waitlist signup page | You | 3 | June 2 |

### Week 3 (June 3-9): Polish & Content
| Task | Owner | Hours | Due |
|------|-------|-------|-----|
| Load 20 real events | Curators/You | 6 | June 5 |
| Write launch copy | You | 2 | June 6 |
| Test on 3 devices | You | 2 | June 7 |
| Build curator onboarding doc | You | 2 | June 8 |
| Soft launch to 5 friends | You | 1 | June 9 |

### Week 4 (June 10-15): Launch
| Task | Owner | Hours | Due |
|------|-------|-------|-----|
| Curator outreach blitz | You | 5 | June 12 |
| Social media setup | You | 2 | June 13 |
| Final bug fixes | You | 3 | June 14 |
| **PUBLIC LAUNCH** | - | - | **June 15** |

---

## 4. CURATOR OUTREACH STRATEGY

### Target Profile
- Event photographers in HK
- Music bloggers / dance music community
- Artists with side hustles
- Bar/event staff who hear about everything

### Outreach Sequence

#### Phase 1: Personal Network (Week of June 1)
**Goal:** 5 curators from friends

Message template:
```
Hey [Name],

Launching CULTIVE - a curated event discovery app for HK. Think Resident Advisor meets local editorial.

Looking for 10 beta curators. You'd:
• Submit events you find (flyers, emails, word-of-mouth)
• Get $50 HKD per approved event
• Help shape the platform

Interested? 15min call this week?

[Calendar link]
```

#### Phase 2: Cold Outreach (Week of June 8)
**Channels:**
- Instagram DMs to event photographers
- Reddit r/HongKong posts
- WhatsApp groups (Nightlife, Arts)
- Facebook event pages

**Goal:** 10 more curators

#### Phase 3: Incentivize Sharing (Ongoing)
- Curators get $10 HKD for each friend they refer (who submits 3+ events)
- Leaderboard in admin (most submissions this month)

### Curator Onboarding Checklist
- [ ] Send onboarding email with guidelines
- [ ] Add to WhatsApp group for curators
- [ ] Schedule 15min intro call
- [ ] Show them the /submit form
- [ ] Explain approval criteria (quality > quantity)
- [ ] Set payment method (PayMe/FPS)

---

## 5. EMAIL SYSTEM ARCHITECTURE

### Tools to Set Up
1. **Resend** or **Postmark** ($0-10/month)
2. **Email templates** in React/html
3. **Supabase Edge Functions** for sending

### Emails Needed

| Trigger | Template | Priority |
|---------|----------|----------|
| User RSVPs to event | Confirmation + calendar invite | High |
| Curator submits event | "Received, pending review" | High |
| Admin approves event | "Approved! $50 HKD coming" | High |
| Weekly digest | "This week in HK" | Medium |
| Member waitlist | "You're on the list" | Medium |
| Curator re-engagement | "We miss you" (if no submit in 14 days) | Low |

### Email Capture Points
1. Home page: "Get the weekly digest" 
2. Event RSVP: Email required
3. Member waitlist: Email + interests
4. Curator signup: Full profile

---

## 6. REVENUE MODEL (Beta vs Full)

### Beta (June-August)
| Stream | Method | Price |
|--------|--------|-------|
| Curator payments | PayMe/FPS manual | $50 HKD/event |
| Member subscriptions | Waitlist only | $0 (collecting interest) |
| Event ticketing | Email RSVP | Free |
| **Monthly burn** | - | ~$2,000 HKD (curator payouts) |

### Full Launch (September+)
| Stream | Method | Price |
|--------|--------|-------|
| Curator payments | Stripe Connect | $50 HKD/event |
| Member subscriptions | Stripe | $99 HKD/month |
| Event ticketing | Stripe + fee | 5% per ticket |

---

## 7. SUCCESS METRICS (First 30 Days)

### Targets
| Metric | Goal | How |
|--------|------|-----|
| Active curators | 15 | Personal outreach |
| Events submitted | 60 (4/curator) | Incentives |
| Events approved | 40 (2/curator) | Quality filter |
| Email signups | 200 | Landing page |
| Member waitlist | 50 | Exclusive appeal |
| Weekly active users | 300 | Events + social |

---

## 8. RISK MITIGATION

| Risk | Mitigation |
|------|------------|
| No curators sign up | Start with you submitting 2 events/day |
| Low quality events | Strict approval criteria, reject 30% |
| Tech bugs | Keep it simple - no payments in beta |
| No user engagement | Weekly email digest keeps people coming back |
| Curators ghost | WhatsApp group for community + weekly check-ins |

---

## 9. LAUNCH DAY CHECKLIST (June 15)

### Morning (9am-12pm)
- [ ] Deploy final build
- [ ] Test all flows one more time
- [ ] Post on personal socials
- [ ] Send email to curator list

### Afternoon (12pm-6pm)
- [ ] Reddit r/HongKong post
- [ ] Instagram story + feed post
- [ ] WhatsApp status updates
- [ ] Message 20 people directly

### Evening (6pm-12am)
- [ ] Monitor submissions
- [ ] Approve first 5 events quickly
- [ ] Thank early curators publicly
- [ ] Note any bugs for tomorrow

---

## 10. POST-LAUNCH SPRINTS

### Sprint 1 (June 16-30): Stabilize
- Fix bugs from launch
- Onboard 5 more curators
- Add 20 more events
- Send first weekly digest

### Sprint 2 (July 1-15): Memberships
- Build Stripe integration
- Launch paid memberships
- 10 founding members

### Sprint 3 (July 16-31): Ticketing
- Real ticket sales
- QR code check-ins
- Revenue share with venues

---

## IMMEDIATE NEXT STEPS (Today)

1. **Reply with your thoughts** on scope (too much? too little?)
2. **Pick your top 3 priorities** from the TODO list
3. **Set calendar block** for June 15 launch date
4. **List 5 people** you can reach out to as first curators

---

**Questions for you:**
1. Is June 15 realistic or do you need more time?
2. Are you comfortable with manual payments for beta, or want Stripe now?
3. Do you have $2-3K HKD budget for first month curator payouts?
4. Should we build a simple landing page separate from the app for SEO?

Let's discuss and lock this plan down.
