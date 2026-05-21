# CULTIVE Beta Launch Plan
**Target Launch: June 15, 2026** (3 weeks from now)

---

## 1. CURRENT STATE ASSESSMENT

### 🚨 CRITICAL INSIGHT FROM PREMORTEM (May 2026)
**The #1 Risk:** *"Cultive City had nothing to sell. We built the subscription flow, vendor dashboard, landing page. Nobody subscribed. Because there was nothing exclusive to subscribe to."*

**The Fix for This Beta:**
- ❌ DON'T build member subscriptions yet (no $99/month system)
- ❌ DON'T build vendor dashboard yet
- ✅ DO build email-based event discovery FIRST
- ✅ DO manually curate 20+ exclusive events before any paywall
- ✅ DO prove people want the events before building membership tech

**Product is ACCESS, not technology.**

---

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
| **Real Event Content** | **CRITICAL** | **Need 20+ real HK events before launch** |
| **Curator Network** | **CRITICAL** | **Need 5 curators committed BEFORE building more tech** |
| User Accounts | MEDIUM | No real auth, just modal placeholder |
| Email System | HIGH | No email capture or notifications |
| Supabase Integration | HIGH | Using mock data, real DB not connected |
| Member Subscriptions | **POSTPONED** | **Don't build until we have exclusive content** |
| Payment (Curators) | MEDIUM | $50 HKD approval - manual PayMe/FPS for beta |

---

## 2. BETA SCOPE (MVP) - REVISED BASED ON PREMORTEM

### What "Beta" Means (SIMPLIFIED)
**OLD (Too Complex):** 10-15 curators + member subscriptions + ticketing + vendor dashboard

**NEW (Focused):**
- **5 committed curators** who submit 3+ events each (15 total real events)
- **Email newsletter** for events (no subscriptions yet, just weekly digest)
- **Manual curation** - you approve every event personally
- **Manual payments** - PayMe/FPS curators when you approve (no automation)
- **NO member subscriptions** until we have 50+ exclusive events
- **NO vendor dashboard** until we have 5+ venue partners

### Core User Flows to Work

#### A. Event Discovery (DONE ✅)
```
User → Landing Page → Browse Events → View Details
```

#### B. Curator Submission (SIMPLIFIED ✅)
```
Curator → /submit → Form → Admin Queue → You Approve → PayMe $50
```
**For Beta:** 
- Manual approval (you review each one)
- Manual payment (PayMe/FPS when you approve)
- No automation needed

#### C. User Engagement (EMAIL ONLY 📧)
```
User → Likes Event → Email Signup → Weekly Digest
```
**For Beta:** No ticketing, no RSVPs. Just:
- Collect emails for weekly digest
- Events link to venue/organizer directly
- You send weekly email with top events

#### D. Member Signup (REMOVED FOR NOW ❌)
~~User → Click "Join" → Email capture → "We'll contact you soon"~~

**Decision:** Don't build membership system yet. From premortem: *"The product is access, not technology. The subscription flow is worthless without exclusive things to subscribe to."*

Build the content first (50+ exclusive events), then add memberships.

---

## 3. CULTIVE-SPECIFIC RISKS FROM PREMORTEM & MITIGATIONS

### Risk 1: "Cultive City Had Nothing to Sell"
**What went wrong in premortem:** Built subscription flow, vendor dashboard, landing page. Launched Week 14. Nobody subscribed. No exclusive content, no PR partner, no vendor deals.

**How we're preventing it:**
| Before Building | Action | Owner |
|----------------|--------|-------|
| 20+ real events | Manually curate first 20 events yourself | You | 
| 5 curators committed | Get 5 people to agree to submit before launch | You |
| 1 venue partner | Get 1 venue to offer exclusive access | You |
| THEN build | Only then add membership features | You |

### Risk 2: "Planning Replaces Shipping"
**What went wrong:** *"We've produced a detailed team plan, brand book, strategy board, competitive analysis... We haven't shipped a single pixel."*

**How we're preventing it:**
- ❌ NO more planning documents after this one
- ✅ This week: Connect Supabase, load 5 real events
- ✅ Next week: Email 5 potential curators
- ✅ Week 3: Soft launch with what we have

### Risk 3: "Generic AI Content"
**What went wrong:** Scraped content was "technically correct but lifeless." No personality, no insider knowledge.

**How we're preventing it:**
- First 20 events are HAND-CURATED by you
- No AI scraping for beta
- Curators must have insider knowledge (event photographers, venue staff, etc.)
- Reject generic event listings

### Risk 4: "Couldn't Find Freelancers"
**What went wrong:** Couldn't find good frontend dev, designer, sales freelancer. Shane burned out doing everything.

**How we're preventing it:**
- Scope is small enough for ONE person (you)
- No freelancers needed for beta
- Manual processes instead of automation
- If you need help, hire ONE person, not three

### Risk 5: "Timeline Fantasy"
**What went wrong:** 16-week plan assumed 20-25 hrs/week of coding. Reality: 10-15 hrs after coordination.

**How we're preventing it:**
- Cut scope to what you can ship in 4 weeks alone
- Manual > automated for beta
- Working product > perfect product
- Launch with 15 events, not 50

---

## 4. TECHNICAL TODOS (With Owners)

### Week 1 (May 20-26): Foundation
| Task | Owner | Hours | Due |
|------|-------|-------|-----|
| Connect Supabase real DB | You | 3 | May 22 |
| Set up Resend/Postmark email | You | 2 | May 23 |
| Build email capture system | You | 4 | May 24 |
| Fix submission → Supabase | You | 3 | May 25 |
| Test curator flow end-to-end | You | 2 | May 26 |

### Week 2 (May 27-June 2): Email & Curators (SIMPLIFIED)
| Task | Owner | Hours | Due |
|------|-------|-------|-----|
| Email capture for weekly digest | You | 3 | May 29 |
| Basic email template | You | 2 | May 30 |
| Email 5 potential curators | You | 2 | May 31 |
| Manual: Add 5 events yourself | You | 3 | June 1 |
| ~~Waitlist signup page~~ | ~~REMOVED~~ | - | - |

**Note:** Removed ticketing, RSVPs, waitlist. From premortem: *"Build content first, then membership features."*

### Week 3 (June 3-9): Content & Soft Launch
| Task | Owner | Hours | Due |
|------|-------|-------|-----|
| Load 15 real events total | You | 4 | June 5 |
| Get 2 curators to commit | You | 3 | June 6 |
| Write launch copy | You | 2 | June 7 |
| Test on phone/desktop | You | 1 | June 8 |
| Soft launch to 3 friends | You | 1 | June 9 |

**Scope cut:** Launch with 15 events (not 50), 2 curators (not 15), no automation.

### Week 4 (June 10-15): PUBLIC LAUNCH
| Task | Owner | Hours | Due |
|------|-------|-------|-----|
| Post on socials | You | 2 | June 12 |
| Reddit/HK forums post | You | 2 | June 13 |
| Fix any critical bugs | You | 2 | June 14 |
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

## 6. REVENUE MODEL (Beta vs Full) - REVISED

### Beta (June-August) - SIMPLIFIED PER PREMORTEM
| Stream | Method | Price | Notes |
|--------|--------|-------|-------|
| Curator payments | Manual PayMe/FPS | $50 HKD/event | Pay when you approve |
| ~~Member subscriptions~~ | ~~REMOVED~~ | ~~$0~~ | ~~Build content first~~ |
| ~~Event ticketing~~ | ~~REMOVED~~ | ~~Free~~ | ~~Links to venue directly~~ |
| Weekly newsletter | Email digest | Free | Build email list |
| **Monthly burn** | - | ~$1,000 HKD | 20 events × $50 = $1,000 |

**From premortem:** *"The product is access, not technology. The subscription flow is worthless without exclusive things to subscribe to."*

### Full Launch (September+) - ONLY AFTER CONTENT PROVEN
| Stream | Method | Price | Trigger |
|--------|--------|-------|---------|
| Curator payments | Stripe Connect | $50 HKD/event | When we have 50+ events |
| Member subscriptions | Stripe | $99 HKD/month | When we have 50+ exclusive events |
| Event ticketing | Stripe + 5% fee | Per ticket | When venues ask for it |

**Rule:** Don't build payment systems until manual process is overwhelmed.

---

## 7. SUCCESS METRICS (First 30 Days) - REALISTIC

### Revised Targets (Post-Premortem)
| Metric | Old Goal | **New Goal** | Why Changed |
|--------|----------|--------------|-------------|
| Active curators | 15 | **5** | Quality > quantity. 5 committed curators > 15 flakey ones |
| Events submitted | 60 | **20** | 15 from you + 5 from curators. Hand-curated quality |
| Events approved | 40 | **15** | High bar. Reject generic listings. Exclusive only |
| Email signups | 200 | **50** | Realistic for soft launch |
| ~~Member waitlist~~ | ~~50~~ | ~~0~~ | ~~Removed - no membership yet~~ |
| Weekly active users | 300 | **100** | First milestone |

### Definition of Beta Success (June 15 - July 15)
**MUST HAVE:**
- [ ] 15 high-quality events on site
- [ ] 5 committed curators who submit regularly
- [ ] 50 email subscribers
- [ ] 100 weekly active users
- [ ] You approve every event personally (quality control)

**NICE TO HAVE:**
- [ ] 1 venue partnership for exclusive access
- [ ] 25 email subscribers

**DON'T BUILD YET:**
- [ ] Membership subscriptions
- [ ] Vendor dashboard
- [ ] Ticketing system
- [ ] Automated payments

**From premortem:** *"Cut the plan in half. What can Shane and Eugene realistically ship in 16 weeks with no freelancers? That's the MVP."*

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
- Get to 15 events total
- Get 2 curators actively submitting
- Send first weekly email digest (manual)
- **Goal:** Prove people want the content

### Sprint 2 (July 1-15): Content & Community
- Reach 25 high-quality events
- Get to 5 committed curators
- 100 email subscribers
- Consider FIRST venue partnership
- **Rule:** Still no membership tech. Content first.

### Sprint 3 (July 16-31): Decide on Memberships
- IF we have 50+ exclusive events AND venue partners:
  - Build simple membership system
  - Launch to waitlist
- IF NOT:
  - Keep focusing on content
  - Delay memberships to August/September

**From premortem:** *"Cultive City gets zero engineering time until Bravel is live, growing, and generating revenue."* (Adapted: No membership tech until content is proven.)

---

## SUMMARY: KEY CHANGES FROM PREMORTEM

### What We Learned
The premortem revealed CULTIVE's biggest risk: **Building technology before having access to sell.**

### What We're Doing Differently
| Original Plan | Premortem Fix | Why |
|--------------|---------------|-----|
| 15 curators, 60 events | 5 curators, 20 events | Quality over quantity |
| Membership subscriptions | REMOVED for beta | *"Product is access, not technology"* |
| Vendor dashboard | REMOVED for beta | Build content first |
| Ticketing system | REMOVED for beta | Direct links to venues |
| Automated payments | Manual PayMe | Automation comes later |
| 16-week timeline | 4-week launch | Ship fast, iterate |

### The One-Line Premortem Applied to CULTIVE
> *"We spent months planning a perfect event platform with member subscriptions and vendor dashboards, but nobody subscribed because we had no exclusive events, no curators, and no venue partners. We built the pipes before securing the water supply."*

**This plan fixes that:**
1. **Content first** - 20 hand-curated exclusive events
2. **Curators second** - 5 committed people
3. **Community third** - Email list, weekly digest
4. **Monetization last** - Only when content is proven

---

## IMMEDIATE NEXT STEPS (This Week)

### Day 1-2 (Today/Tomorrow)
1. ✅ Review this revised plan
2. ✅ Confirm June 15 is realistic (or push to June 30)
3. ✅ Set calendar block for 10hrs this week

### Day 3-4 (May 22-23)
4. Connect Supabase
5. Add 3 real HK events yourself

### Day 5-7 (May 24-26)
6. Email 3 potential curators
7. Set up basic email capture

**STOP.** No more planning. Start shipping.

---

**From premortem:** *"The biggest risk isn't N+ blocking us, or freelancers failing, or the mascot flopping. The biggest risk is that we keep producing documents instead of product."*

**We've produced the document. Now we build.**
