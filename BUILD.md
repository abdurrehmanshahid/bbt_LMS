# BUILD.md — Step-by-Step Build Sequence
## Every step has an exact prompt. Run in order. Do not skip.

---

## HOW TO USE THIS FILE

Each step has:
- WHAT: what gets built
- WHY: why this exact order
- PROMPT: copy-paste this into Claude Code or Cowork
- DONE WHEN: exact criteria to mark step complete
- TEST: test command to run before moving to next step

Total steps: 42 for Phase 1 full MVP.
Do not start Step N+1 until Step N's tests pass.

---

## PHASE 0 — PROJECT FOUNDATION (Steps 1–5)

---

### STEP 1 — Monorepo Scaffold

**WHAT:** Create the full project structure with all packages and apps defined.
**WHY:** Every other step depends on this structure. Get it right first.

**PROMPT:**
```
Create a pnpm monorepo for BBT LearnOS with this exact structure:

bbt-learnos/
  apps/
    api/          (NestJS backend)
    web/          (Next.js 14 App Router frontend)
    mobile/       (React Native + Expo)
    ml/           (FastAPI Python ML service)
    e2e/          (Playwright E2E tests)
    load-tests/   (k6 load test scripts)
  packages/
    shared/       (TypeScript types shared across apps)
    ui/           (BBT design system components)
    config/       (shared ESLint, TypeScript, Tailwind configs)

Root configuration:
- pnpm-workspace.yaml listing all apps and packages
- Root package.json with scripts: dev, build, test, lint, type-check
- TypeScript: strict: true, target: ES2022, all paths configured
- ESLint: @typescript-eslint/recommended + import/order rules
- Prettier: singleQuote, trailingComma: all, semi: true
- .gitignore covering: node_modules, .env*, dist/, .next/, __pycache__/
- .env.example with all required environment variables (no values)

Required environment variables to document in .env.example:
DATABASE_URL, REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
MUX_TOKEN_ID, MUX_TOKEN_SECRET, MUX_WEBHOOK_SECRET,
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT,
EASYPAISA_STORE_ID, EASYPAISA_HASH_KEY,
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION,
AWS_SES_FROM_EMAIL, FCM_SERVER_KEY,
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID,
NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL
```

**DONE WHEN:** `pnpm install` runs clean. `pnpm type-check` passes on empty project.
**TEST:** `pnpm lint && pnpm type-check`

---

### STEP 2 — Database Schema (Core Entities)

**WHAT:** All PostgreSQL tables for Phase 1.
**WHY:** Schema decisions are the most expensive to change later. Lock them now.

**PROMPT:**
```
Create the complete Prisma schema for BBT LearnOS Phase 1.
File: apps/api/prisma/schema.prisma

Required models with ALL fields:

User: id(uuid), email(unique), passwordHash, name, avatarUrl, role(enum:
LEARNER/CREATOR/ADMIN/EMPLOYER/FRANCHISE_OWNER), isActive, emailVerified,
createdAt, updatedAt, deletedAt(nullable)

LearnerProfile: id, userId(FK User), currentTrackId(FK Track nullable),
currentModuleId(nullable), streakDays, lastActiveAt, absorptionScore,
absorptionStatus(INELIGIBLE/ELIGIBLE/UNDER_REVIEW/ABSORBED/REFERRED)

CreatorProfile: id, userId(FK User), tier(1/2/3), displayName(unique),
bio, qualityScore(0.0-1.0), moderationFlags(int), revenueSharePercent,
isVerified, verificationDetails(Json nullable)

Track: id, slug(unique), title, description, icon, trackNumber(1-7),
isActive, enrollmentCount, avgCompletionRate, createdAt, updatedAt

Module: id, trackId(FK Track), order(int), title, description,
estimatedMinutes, passingScore(default 60), isActive

Concept: id, moduleId(FK Module), title, description, order(int)
ConceptPrerequisite: conceptId(FK Concept), prerequisiteId(FK Concept)

Content: id, creatorId(FK User), trackId(FK Track), moduleId(FK Module nullable),
conceptId(FK Concept nullable), type(REEL/LECTURE/LIVE_RECORDING/RESOURCE),
title, description, muxAssetId(nullable), muxPlaybackId(nullable),
duration(int seconds nullable), transcript(Text nullable), thumbnailUrl(nullable),
status(PENDING_MODERATION/APPROVED/REJECTED/DRAFT), tags(String[]),
viewCount, saveCount, shareCount, createdAt, updatedAt

ModerationRecord: id, contentId(FK Content), adminId(FK User nullable),
decision(PENDING/APPROVED/REJECTED/HELD), feedbackJson(Json nullable),
aiFlags(Json nullable), aiConfidence(Float nullable), createdAt

Enrollment: id, learnerId(FK User), trackId(FK Track), plan(FREE/MONTHLY/ANNUAL),
status(ACTIVE/PAUSED/CANCELLED/EXPIRED), stripeSubscriptionId(nullable),
startDate, endDate(nullable), createdAt

Assessment: id, learnerId(FK User), moduleId(FK Module), attemptNumber(int),
score(Float), passed(bool), submittedAt, answers(Json),
flaggedForReview(bool), reviewReason(nullable), sessionStartedAt,
submissionDuration(int seconds)

SkillBadge: id, learnerId(FK User), conceptId(FK Concept), score(Float),
issuedAt, badgeJson(Json), verificationUrl, isRevoked(bool default false)

Cohort: id, trackId(FK Track), name, startDate, maxSize(default 20),
status(ACTIVE/COMPLETED/DISBANDED), moduleStartIndex(int default 0)
CohortMember: cohortId(FK Cohort), learnerId(FK User), joinedAt, isVisible(bool)

Payment: id, userId(FK User), amount(Float), currency(String),
gateway(STRIPE/JAZZCASH/EASYPAISA), gatewayTransactionId, status(PENDING/SUCCESS/FAILED/REFUNDED),
metadata(Json), createdAt

Franchise: id, ownerId(FK User), name, city, address, psda_status(PENDING/ACTIVE/SUSPENDED),
navttc_status, complianceCheckedAt, revenueSharePercent(default 15),
setupFeeAmount, setupFeePaid(bool)

Notification: id, userId(FK User), type(String), title, body, data(Json nullable),
isRead(bool), sentAt, readAt(nullable)

Indexes required: All FK columns. Content.(trackId, status). Assessment.(learnerId, moduleId). SkillBadge.(learnerId). Enrollment.(learnerId, status).

Also create the initial seed file: prisma/seed.ts
Seed: 7 Track records (all BBT tracks), 3 test users (learner/creator/admin),
5 modules for Track 05 (Cybersecurity), sample concepts with prerequisites.
```

**DONE WHEN:** `npx prisma migrate dev` runs clean. `npx prisma db seed` populates data.
**TEST:** `npx prisma validate && npx prisma generate`

---

### STEP 3 — Auth Module (JWT + OAuth)

**WHAT:** Complete authentication system.
**WHY:** Everything else requires auth. Build it completely and correctly once.

**PROMPT:**
```
Build the complete NestJS auth module for BBT LearnOS using SKILL-07 pattern.

Requirements:
1. POST /api/auth/signup — create user, hash password (bcrypt cost 12),
   send verification email via SES, return access token + set refresh token cookie
2. POST /api/auth/login — validate credentials, check account lock (Redis),
   increment fail counter, return tokens. Lock after 5 fails (15min)
3. POST /api/auth/refresh — validate refresh token cookie, rotate token,
   detect reuse attacks (store token hash in Redis, invalidate on reuse)
4. POST /api/auth/logout — blacklist access token (Redis TTL = remaining expiry),
   clear refresh token cookie
5. GET /api/auth/google — Google OAuth initiation
6. GET /api/auth/google/callback — create/find user, return tokens
7. POST /api/auth/apple — Apple Sign In (mobile flow, validate id_token)
8. POST /api/auth/forgot-password — send reset email (SES), store token (Redis 1hr TTL)
9. POST /api/auth/reset-password — validate token, update hash, invalidate all sessions

JWT spec:
- Access token: RS256, 15min, payload: { sub, role, tier, sessionId, jti }
- Refresh token: stored as httpOnly SameSite=Strict Secure cookie, 30 days
- Generate RS256 key pair on startup, store public key for verification

Guards to create:
- JwtAuthGuard (validates access token)
- RolesGuard (checks role from token against @Roles() decorator)
- TierGuard (checks creator tier against @MinTier() decorator)
- OptionalJwtGuard (auth optional — for public pages with personalisation)

Rate limiting: @nestjs/throttler, 10 req/min on /auth/login and /auth/signup
Error codes: INVALID_CREDENTIALS, ACCOUNT_LOCKED, EMAIL_NOT_VERIFIED,
TOKEN_EXPIRED, TOKEN_INVALID, REFRESH_TOKEN_REUSED

Write unit tests for all auth service methods. Mock Prisma and Redis.
Coverage target: 100% on auth service.
```

**DONE WHEN:** All auth endpoints return correct status codes and bodies.
**TEST:** `pnpm test auth --coverage` — must show 100% auth service coverage.

---

### STEP 4 — Track + Content + Assessment Backend

**WHAT:** Core learning data APIs.
**WHY:** Frontend and mobile depend on these. Must be stable before UI work.

**PROMPT:**
```
Build the track, content, assessment, and enrollment NestJS modules for BBT LearnOS.

Track Module:
- GET /api/tracks — list all 7 tracks (public, cached 24h)
- GET /api/tracks/:slug — single track with modules outline (public)
- GET /api/learner/track/:trackId/modules — full modules with lock status
  (locked if: not enrolled, or previous assessment not passed)
- Business rule: First 2 modules always accessible on free enrollment

Content Module:
- GET /api/content/:id — single content item (public if APPROVED)
- GET /api/learner/feed — personalised feed (rule: track-locked, progression-first)
  Cold start (< 20 events): return first uncompleted module content only
  Normal: 40% progression, 30% reinforcement, 20% adjacent, 10% social
  All from enrolled track ONLY — never cross-track
- POST /api/creator/upload — create Content record (status: PENDING_MODERATION),
  generate Mux direct upload URL, return both content ID and upload URL
- POST /api/webhooks/mux — handle video.asset.ready (update muxPlaybackId, duration,
  thumbnail) and video.asset.errored (mark content FAILED)

Assessment Module:
- POST /api/assessment/start — create assessment session, store startTime +
  deviceFingerprint + ipAddress in Redis (key: assessment:{userId}:{moduleId})
- POST /api/assessment/submit:
  1. Validate: module video completed, no active lockout, session exists
  2. Timing check: submissionTime - startTime must be >= module.estimatedMinutes * 0.3
     (can't submit faster than 30% of content length)
  3. IP change detection: flag if different from session IP
  4. Grade: compare answers to correct answers, calculate score
  5. If score >= module.passingScore: issue skill badge, unlock next module
  6. If score < passingScore: set 24h Redis lockout key
  7. Store Assessment record with all metadata
- GET /api/assessment/status/:moduleId — current status (LOCKED/AVAILABLE/PASSED/LOCKED_RETRY)

Enrollment Module:
- POST /api/learner/enroll/free — free enrollment (2-module access)
- POST /api/learner/enroll — paid enrollment via Stripe
  (create Stripe customer + subscription, handle payment, grant full access)
- DELETE /api/learner/enrollment/:trackId — cancel subscription (Stripe cancel)
- POST /api/webhooks/stripe — handle payment events:
  payment_intent.succeeded → grant access
  customer.subscription.deleted → revoke access
  invoice.payment_failed → notify learner, grace period 3 days

For all endpoints write:
- Input validation with class-validator DTOs
- Unit tests for service methods
- Inline JSDoc comments on business rules
```

**DONE WHEN:** Postman/curl can enroll a learner, retrieve their feed, and submit an assessment.
**TEST:** `pnpm test --testPathPattern="track|content|assessment|enrollment"`

---

### STEP 5 — Cohort + Notification System

**PROMPT:**
```
Build the cohort auto-assignment and notification modules for BBT LearnOS.

Cohort Module:
- On enrollment (event from Enrollment module): find active cohort for learner's track
  at same starting module with < 20 members. If found: add learner. If not found:
  create new cohort, add learner. If 48h pass with < 3 members: merge with adjacent cohort.
- GET /api/learner/cohort — my cohort (members visible if they opted in)
  Return: cohortId, memberCount, visibleMembers (displayName, avatarUrl, lastModule, streak only — NO email/phone)
- GET /api/cohort/:id/activity — recent activity events (module completions, assessments passed)
- POST /api/cohort/study-group — create study group (max 6 members from same track)
- WebSocket: socket.io events:
  cohort:memberProgress — broadcast when member completes module (to same cohort)
  cohort:newMember — when someone joins cohort

Notification Module (BullMQ jobs):
- sendPushJob — FCM push via Firebase Admin SDK
- sendEmailJob — AWS SES via @aws-sdk/client-ses + React Email templates
- scheduleNotificationJob — delayed notifications (streak warnings, session reminders)
Triggers to implement:
- Cohort member completes module → push to other cohort members (if opted in)
- 6pm local time: streak warning if learner hasn't been active today
- Live session starting in 1h: push to learners who bookmarked it
- Moderation feedback ready: push to creator
- Badge issued: push to learner
- Payment failed: email to learner
Hard cap: max 3 pushes per user per day. Respect do-not-disturb hours (10pm–8am local).

Notification settings: users can opt out per category in GET/PATCH /api/learner/notification-settings
```

**DONE WHEN:** Enrolling two learners in same track places them in same cohort. Completing a module triggers cohort broadcast.
**TEST:** `pnpm test --testPathPattern="cohort|notification"`

---

## PHASE 1 CONTINUED (Steps 6–20) — Frontend

---

### STEP 6 — BBT Design System

**PROMPT:**
```
Create the BBT LearnOS design system in packages/ui using Radix UI primitives
and Tailwind CSS.

Tailwind config extension (packages/config/tailwind.config.ts):
colors:
  navy: { DEFAULT: '#0d0d2e', 50: '#e8e8f5', ... (full scale) }
  indigo: { DEFAULT: '#2E3192', ... }
  orange: { DEFAULT: '#F7941D', ... }
fontFamily:
  display: ['Bebas Neue', 'sans-serif']
  body: ['DM Sans', 'sans-serif']
  mono: ['DM Mono', 'monospace']

Components to build in packages/ui/src/:
- Button (variants: primary/secondary/ghost/danger, sizes: sm/md/lg, loading state)
- Input (variants: default/error/success, with label, helpText, errorMessage)
- Card (variants: default/elevated/bordered, with header/body/footer slots)
- Badge (variants: skill/status/tier, with icon support)
- Avatar (sizes: xs/sm/md/lg/xl, with fallback initials)
- Modal (Radix Dialog, accessible, BBT-styled)
- Dropdown (Radix DropdownMenu, accessible)
- Tabs (Radix Tabs, horizontal and vertical variants)
- ProgressBar (with percentage, color variants, animated)
- Skeleton (matches layout of: card, feed-item, video-player, profile)
- Toast (Radix Toast, variants: success/error/warning/info, 4s auto-dismiss)
- TrackCard (shows track icon, title, enrollment count, completion rate, CTA)
- FeaturePill (small pill for feature tags)
- PhaseStep (Train → Intern → Shadow → Expert visual component)

All components:
- Export TypeScript prop interfaces
- Support dark mode (navy background) and light mode
- Include Storybook stories
- ARIA labels on all interactive elements
- Keyboard navigation tested
```

**DONE WHEN:** All components render correctly in Storybook with dark + light variants.
**TEST:** `pnpm storybook:build` — no errors.

---

### STEP 7 — Public Surface (SEO-Critical Pages)

**PROMPT:**
```
Create the Next.js App Router public surface for BBT LearnOS. These pages
are the primary organic discovery engine — SSR and Core Web Vitals are
non-negotiable.

Pages to build:

1. app/page.tsx — Homepage
   Above fold: headline "The Career Operating System Pakistan Needed"
   Three audience CTAs: "I want to learn", "I want to teach", "I want to hire talent"
   Social proof bar: learner count, employer count, completion rate, PSDA/NAVTTC/Cisco logos
   Track preview cards (all 7 tracks, with icon, 1-line description, enroll CTA)
   How it works: Train → Intern → Shadow → Expert visual

2. app/tracks/[slug]/page.tsx — Individual track landing pages (×7)
   generateStaticParams() for all 7 slugs
   generateMetadata() with: title, description, OG tags, JSON-LD (Course schema)
   Dynamic content: creator count, module count, avg completion rate, employer demand
   Curriculum outline (first 3 modules visible, rest behind enrollment)
   Creator profiles grid (top 3 creators for this track)
   Employer testimonials (if available)
   Pricing section (free tier vs paid) with enroll CTA

3. app/concepts/[slug]/page.tsx — Concept artifact pages (auto-generated)
   generateMetadata() with concept title + track context
   JSON-LD: LearningResource schema
   30-second video preview (Mux signed URL, no auth required)
   Full transcript below video (for indexability)
   Related concepts sidebar (internal linking — critical for domain authority)
   Enroll CTA: "This concept is part of [Track Name] — Start Free"
   Multilingual: metadata in English + Urdu (hreflang tags)

4. app/creators/[username]/page.tsx — Creator public profile
   JSON-LD: Person schema
   Creator bio, credentials, track expertise
   Content catalogue (APPROVED content only, with 30-sec previews)
   Learner ratings, completion rates on their content
   "Follow [Creator]" CTA — requires auth

5. app/jobs/page.tsx — Opportunity board
   Server-side rendered list of employer-posted opportunities
   Filter: track, location, type (full-time/freelance/remote)
   JSON-LD: JobPosting schema on each listing
   Each listing links to /jobs/[id] (individual indexed page)

All pages must:
- Pass Core Web Vitals (LCP < 2.5s, CLS < 0.1, FID < 100ms)
- Include canonical URLs
- Include Open Graph image generation (Next.js og)
- Be fully rendered on server (no blank SSR)
- Score > 90 on Lighthouse SEO and Accessibility
```

**DONE WHEN:** `next build` succeeds. Lighthouse score > 90 on all 4 metrics on all pages.
**TEST:** `npx lighthouse https://localhost:3000 --output=json` — all scores > 90.

---

### STEP 8 — Auth UI Flows

**PROMPT:**
```
Build the authentication UI for BBT LearnOS in Next.js App Router.

Routes: app/auth/signup, app/auth/login, app/auth/forgot-password,
app/auth/reset-password/[token], app/auth/verify-email/[token]

Signup page:
- Fields: name, email, password (show/hide toggle), confirm password
- Real-time validation (on blur): email format, password strength meter (zxcvbn)
- Password requirements: 8+ chars, 1 uppercase, 1 number, 1 special
- Google OAuth button (redirect to /api/auth/google)
- Apple Sign In button (mobile: native, web: REST flow)
- After signup: redirect to /onboarding/quiz with success toast

Login page:
- Fields: email, password
- Remember me (30-day refresh token vs 7-day)
- Forgot password link
- Google + Apple OAuth buttons
- Error states: INVALID_CREDENTIALS (generic — no "email not found" hints), ACCOUNT_LOCKED (show unlock time)
- After login: redirect to /dashboard or saved returnUrl

Onboarding quiz (app/onboarding/quiz):
- 5 questions, one per screen (progress bar showing 1/5, 2/5...)
- Question 1: What is your goal? (Get a job / Freelance / Build a product / Upskill)
- Question 2: What is your background? (CS student / Self-taught / Career changer / Professional)
- Question 3: How much time per week? (<5h / 5–10h / 10–20h / 20h+)
- Question 4: What matters most? (Job guarantee / Fast skill / Flexibility / Certificate)
- Question 5: Which area interests you? (AI/ML / Cloud / Cybersecurity / Web Dev / Design / Marketing / ERP)
- Submit → POST /api/learner/onboarding/quiz → show recommended track
- Track recommendation screen: track card + "Start Free" and "View Full Track" buttons

All forms:
- React Hook Form + Zod validation
- Loading states on submit buttons
- Accessible: keyboard navigation, ARIA labels, error association
- BBT design system components throughout
```

**DONE WHEN:** Full signup → quiz → track selection flow completes without errors in Playwright.
**TEST:** Run E2E test FUNC-001 from TESTS.md.

---

### STEP 9 — Learner Dashboard + Video Player

**PROMPT:**
```
Build the learner dashboard and video player for BBT LearnOS.

app/dashboard/page.tsx — Learner home (authenticated):
- Left: Track progress card (current module, completion %, next step)
- Center: Feed (40% progression, 30% reinforcement, 20% adjacent, 10% social)
  Feed items: FeedCard component (thumbnail, title, creator, duration, content type badge)
  Infinite scroll with React Query useInfiniteQuery
  Loading: skeleton cards (5 items)
  Empty: "Your track content is being set up — check back soon"
- Right: Cohort widget (member list if opted in, recent activity, streak display)
  Below: Upcoming live sessions for their track
- Top: Streak indicator (flame icon + days count)
- Notification bell with unread count badge

app/track/[trackId]/page.tsx — Track detail (enrolled learner):
- Module list with lock/unlock status
- For each module: title, estimated time, status (LOCKED/AVAILABLE/COMPLETED/ASSESSMENT_PENDING)
- Locked modules show prerequisite: "Complete Module [N] assessment to unlock"
- Click AVAILABLE module → navigate to /track/[trackId]/module/[moduleId]

app/track/[trackId]/module/[moduleId]/page.tsx — Module view:
- Video player (full width, max 720px centered)
- Tabs below: Overview | Resources | Assessment | Peer Reviews
- Overview: module description, key concepts list
- Resources: downloadable files attached to module
- Assessment: only visible after video 90% watched. Shows: question count, time estimate, pass threshold (60%)
- Peer Reviews: submit project, see others' projects, leave reviews

Video Player Component (packages/ui/src/VideoPlayer.tsx):
- Video.js core + HLS.js plugin for adaptive bitrate
- Mux signed URL (fetched from API, not embedded in page source)
- Events tracked (POST /api/analytics/event): play, pause, seek, speed_change, quality_change, completed
- Completion trigger at 90% watch threshold → enable assessment tab
- Session mode: when active, shows "Focus Mode" badge, feed locked to progression
- Controls: play/pause, progress scrubber, volume, speed (0.75/1/1.25/1.5/2×), fullscreen
- Prevents right-click context menu
- Quality indicator (360p/720p/1080p — adaptive)
- No YouTube branding — BBT-styled player entirely

Use Video.js + videojs-http-streaming (HLS.js wrapper).
Player reports completion to parent via onComplete callback.
```

**DONE WHEN:** Learner can browse feed, open a module, watch video, and assessment tab unlocks at 90%.
**TEST:** `pnpm e2e --grep "video player"` + manual walkthrough.

---

### STEP 10 — Assessment + Badge UI

**PROMPT:**
```
Build the assessment flow and badge display UI for BBT LearnOS.

Assessment Flow:
app/track/[trackId]/module/[moduleId]/assessment:

1. Assessment start screen:
   - Module name, question count, time estimate, pass threshold (60%)
   - Warning: "You cannot go back — answer each question before proceeding"
   - "Begin Assessment" button → POST /api/assessment/start → start timer

2. Question screen (one question at a time):
   - Progress indicator (Q 3 of 10)
   - Question text (may include code block — use PrismJS syntax highlighting)
   - Answer options: MCQ (radio buttons, keyboard navigable 1/2/3/4)
   - For code-submission questions: Monaco editor embed
   - Next button (disabled until answer selected)
   - No back navigation
   - Timer shown in top right (client-side countdown from session start)

3. Project submission (if module has practical task):
   - Rich text description of task
   - Submission options: file upload OR GitHub URL OR live URL
   - Submit for peer review button

4. Results screen:
   - Score: large circular progress indicator (colour: green >= 60, red < 60)
   - Pass: "Badge Earned!" animation (confetti burst, badge card slides in)
     Badge card shows: skill name, BBT logo, date, "View in Portfolio" link
   - Fail: score, which concepts were missed, "Retry available in 24h"
     Shows: estimated wait time, suggested study resources

Badge Portfolio (app/learner/portfolio/page.tsx):
- Public URL: /portfolio/[username] (indexed, employer-viewable)
- Badge grid: each badge shows skill name, track, date, score
- Click badge: expands to show: full OB3 credential JSON, QR code for verification, employer share link
- Project showcase: cards linking to submitted projects
- Assessment percentile: "Top X% in [Track Name]"
- Shareable: Open Graph image generated showing badge count and top skills

Absorption eligibility section (only visible to learner, not public):
- Eligibility score (0-100)
- Breakdown: badges (40%), projects (30%), assessments (20%), cohort (10%)
- Status indicator: "Not yet eligible / Eligible for review / Under review / Absorbed"
- Call to action when eligible: "Apply for BBT consideration"
```

**DONE WHEN:** Full assessment flow completes and badge appears in portfolio.
**TEST:** Run E2E FUNC-002 from TESTS.md.

---

### STEP 11 — Creator Dashboard

**PROMPT:**
```
Build the creator dashboard for BBT LearnOS.

app/creator/dashboard — Main creator overview:
- KPI cards: Total views (30d), Completion rate (all content), Revenue this month, Subscriber count
- Content performance table: title, views, completion %, save rate, status (APPROVED/PENDING/REJECTED)
  Sort by any column. Click row → content detail
- Quick upload button → /creator/upload
- Tier badge with progress to next tier (quality score bar, moderation record)

app/creator/upload — Upload flow:
1. Drag-drop file zone (video files only, max 3GB, shows type and size validation)
2. While uploading to Mux: progress bar (percentage from Mux upload URL progress events)
3. After Mux upload: metadata form:
   - Title (required, 5–100 chars)
   - Track (select from 7 tracks — must match creator's expertise)
   - Content type (REEL ≤3min / LECTURE ≤120min / RESOURCE non-video)
   - Module (optional — link to specific module)
   - Concept tags (multi-select from track's concept list)
   - Description (rich text, max 1000 chars)
4. Submit → POST /api/creator/upload → status: PENDING_MODERATION
5. Success screen: "Your content is in review — typically 24h for Tier 2"

app/creator/analytics — Full analytics:
- Date range picker (7d / 30d / 90d / custom)
- Charts: views over time (line), completion rate by content (bar), revenue by type (doughnut)
- Per-content breakdown table with: title, views, watch time, completion %, save %, assessment pass rate, revenue attributed
- Audience: top countries, device breakdown, content type preference
- Top performing concept (by completion) — signals what to create more of

app/creator/moderation-inbox — Feedback inbox:
- All content with REJECTED or HELD status
- For each: content title, rejection reason, specific feedback with timestamp reference
- "Resubmit" button: pre-fills upload form with same metadata, learner re-uploads video
- "Appeal" button: creates appeal ticket (admin reviews within 72h)

app/creator/revenue — Revenue breakdown:
- Total earned, pending payout, paid out (lifetime)
- Breakdown by source: course sales, subscriptions, ad share, live sessions
- Payout history table
- "Request payout" button (enabled when balance >= PKR 5,000 / USD 20)
- Bank account settings (Stripe Connect onboarding for international, bank details for Pakistan)
```

**DONE WHEN:** Creator can upload, see moderation status, and view analytics.
**TEST:** E2E FUNC-003 from TESTS.md.

---

### STEP 12 — Admin Dashboard

**PROMPT:**
```
Build the admin dashboard for BBT LearnOS.

app/admin — Protected by ADMIN role. Sidebar navigation.

Moderation Queue (/admin/moderation):
- Queue table: content thumbnail, title, creator (tier badge), track, upload time, AI flags
- Sort: flagged-first, then Tier 1, then by time
- AI confidence scores shown as coloured bars per flag category
- Click row: full content preview (video + transcript side by side), creator history panel
- Three action buttons: Approve (green) / Send Feedback + Hold (yellow) / Block + Report (red)
- Feedback modal: predefined reason (AUDIO_QUALITY / OFF_TRACK / INCOMPLETE / QUALITY_LOW / POLICY),
  specific feedback textarea with timestamp reference field, AI-drafted suggestion shown first for human to edit
- SLA indicator: items older than 4h (Tier 2/3) or 24h (Tier 1) shown in red

Platform Health (/admin/health):
- Real-time metrics (auto-refresh 30s):
  DAU / WAU / MAU (sparkline charts)
  Active subscriptions by track (bar chart)
  Revenue MRR + trend vs last month
  Content pipeline: pending / approved / rejected counts today
  Cohort completion rates by track
  Churn by track (learners who cancelled this month)
  Top support ticket reasons (from ticketing system integration)

User Management (/admin/users):
- Search by email, name, ID
- Filter by role, status, track, subscription tier
- User detail: profile, enrollment history, payment history, moderation interactions
- Actions: warn (with reason), suspend (7/14/30/60 days), permanent ban, refund last payment
- All actions logged in audit trail with admin ID and timestamp

Creator Tier Management (/admin/creators/tier-review):
- Queue of Tier 1 creators applying for Tier 2
- For each: creator profile, content samples (top 3 by completion), quality score breakdown,
  moderation history, domain credentials submitted
- Decision: Approve promotion / Reject with reason / Request more content

Content Gap Report (/admin/gaps):
- Top 50 searches with zero results (last 30d)
- Top 50 searches with low engagement (clicked nothing)
- Suggested creator recruits for each gap
- Export as CSV for BD team

Franchise Overview (/admin/franchises):
- All franchise locations with: active learner count, completion rates, compliance status (traffic light), revenue this month
- Click location: drill into trainer performance, compliance checklist, recent support tickets
- Export: all franchise data as CSV for monthly reporting
```

**DONE WHEN:** All admin screens load with real data. Moderation approve/reject updates content status.
**TEST:** Unit tests on all admin service methods. Manual walkthrough of moderation flow.

---

### STEP 13 — Mobile App (React Native + Expo)

**PROMPT:**
```
Build the BBT LearnOS React Native app with Expo for iOS and Android.
Target: learner and creator primary workflows on mobile.

Setup:
- Expo managed workflow with EAS Build
- Navigation: Expo Router (file-based, matches web URL structure)
- State: same Zustand + React Query as web (shared packages/shared types)
- UI: custom components from packages/ui adapted for React Native
  (no Tailwind — use StyleSheet, same color tokens)

Screens to build:

(Learner)
screens/index — Feed (primary tab)
  FlatList of FeedCards (thumbnail, title, creator, duration)
  Pull to refresh
  Infinite scroll (FlatList onEndReached)
  Tab bar: Feed | My Track | Cohort | Profile

screens/track/[trackId] — Track modules list
  Modules with lock status
  Progress bar at top

screens/module/[moduleId] — Module view
  Video player (native video, HLS via expo-av or react-native-video)
  Content tabs: Overview | Assessment | Resources

screens/profile — Learner profile + badges
  Badge grid
  Streak display
  Absorption eligibility score

(Creator)
screens/creator/dashboard — Stats overview
screens/creator/upload — Upload from camera roll or file picker (expo-document-picker)
screens/creator/content — Content list with status

Push notification handling:
- FCM via Expo Notifications
- Deep link on tap: notification of type MODULE_UNLOCK → navigate to module screen
- notification of type COHORT_ACTIVITY → navigate to cohort screen
- notification of type BADGE_ISSUED → navigate to portfolio screen

Offline support:
- Downloaded modules cached locally (expo-file-system)
- Video downloaded via Mux download URL (Tier 2+ subscription only)
- Download limit: 5 modules
- Downloads expire after 30 days (check on app open)
- Offline indicator banner when no connection
```

**DONE WHEN:** App runs on iOS simulator and Android emulator. Feed loads. Video plays.
**TEST:** `pnpm expo start` — manual smoke test on both platforms.

---

## PHASE 2 STEPS (14–30) — Intelligence + Employer + LTI

---

### STEP 14 — Elasticsearch Internal Search

**PROMPT:**
```
Implement Elasticsearch-powered internal search for BBT LearnOS.

Index: bbt_content
Mappings:
  id: keyword
  title: text (analyzer: english) + keyword (for exact)
  transcript: text (analyzer: english)
  description: text
  trackId: keyword
  type: keyword (REEL/LECTURE/LIVE_RECORDING/RESOURCE)
  creatorTier: integer
  tags: keyword[]
  completionRate: float
  saveRate: float
  viewCount: integer
  conceptIds: keyword[]
  difficulty: keyword (BEGINNER/INTERMEDIATE/ADVANCED)
  issuedAt: date
  status: keyword (index only APPROVED content)

Custom scoring (function_score):
  base query: multi_match on title (boost 3), transcript (boost 1), tags (boost 2)
  score functions:
    - completionRate * 0.3 (normalised 0-1)
    - saveRate * 0.2
    - creatorTier boost: tier3=1.5, tier2=1.2, tier1=1.0
    - recency: exponential decay, 30d half-life
    - learner personalisation: boost content from creators they've saved before

Personalisation (read from learner profile):
  - Filter results to learner's enrolled track unless query is very specific
  - Boost content at learner's current difficulty level
  - Boost content from creators they've engaged with

API endpoints:
  GET /api/search?q=&trackId=&type=&difficulty=&after= (cursor)
  Returns: items[], total, nextCursor, zeroResults(bool for gap tracking)

Sync pipeline:
  On content APPROVED: index to Elasticsearch
  On content REJECTED/DELETED: delete from index
  On engagement update (hourly batch): update completionRate, saveRate, viewCount

Search analytics (ClickHouse):
  Every search: log query, filters, resultCount, userId, trackId, clickedItemId
  Zero results: flag in content_gaps table
```

**DONE WHEN:** Search returns relevant results ranked by quality. Zero-result queries logged.
**TEST:** Manual search test. Verify personalisation boosts correct content.

---

### STEP 15 — Employer End + talent.bigbinarytech.com

**PROMPT:**
```
Build the employer end and talent.bigbinarytech.com for BBT LearnOS using SKILL-12.

Subdomain: talent.bigbinarytech.com (Next.js app with separate layout)

Employer auth:
- Separate signup flow with company verification (KYB):
  company name, registration number, country, contact email
  Admin manually approves employer accounts (prevent abuse)
  Verified employers get EMPLOYER role

Pages:
/talent — Talent search
  Search filters: track (multi-select), badge level (min score), geography,
    availability (immediate/30days/open), salary expectation range
  Results: candidate cards (display name, track, top 3 badges, last active)
  Click candidate: public portfolio view + "Request Contact" button
  Contact request: goes through platform (learner must accept), learner's email never shown directly

/talent/staff-aug — Staff Augmentation Request
  Form: skills needed (multi-select from skill taxonomy), duration (1 week / 1 month / 3 months / ongoing),
    start date, max hourly budget
  Submit → creates StaffAugRequest → BBT ops receives notification to match talent
  Status tracking: SUBMITTED / MATCHING / PROFILES_SENT / AGREED / ACTIVE / COMPLETED

/talent/hire-team — Hire-a-Team Builder
  Visual team builder: add role slots (Full Stack, Cloud, UI/UX etc.)
  For each role: skill requirements, seniority level
  Submit assembled team request → BBT ops matches complete team
  Pricing: shown as per-team-per-month range based on selected roles

/jobs — Opportunity Posting
  Form: job title, track alignment, description, location/remote, salary range,
    type (full-time/contract/internship), closing date
  Featured listing (paid): $49/post for priority in learner feed
  All approved jobs indexed publicly for discovery (JSON-LD JobPosting schema)

API additions:
GET /api/employer/talent — search with filters (employer auth required, subscribed employers only)
POST /api/employer/contact-request/:learnerId — request contact (learner notified, must accept)
GET /api/employer/referrals — absorption pipeline learners referred by BBT
POST /api/employer/opportunities — post job
GET /api/badges/:id/verify — public badge verification (no auth required)
POST /api/employer/staff-aug — submit augmentation request
```

**DONE WHEN:** Employer can search talent, verify badges, and post opportunities.
**TEST:** Unit tests on all employer service methods. E2E: verify badge → confirm status.

---

### STEP 16 — LTI 1.3 Integration

Use SKILL-13. Implement ltijs.
**Test:** Connect to a test Moodle instance. Verify grade passback works.

---

### STEP 17 — Open Badges 3.0 Issuance

Use SKILL-14. Sign badges with RS256.
**Test:** Verify badge JSON validates against OB3 spec schema.

---

### STEP 18 — ML Recommendation Service (FastAPI)

**PROMPT:**
```
Build the FastAPI ML recommendation service for BBT LearnOS.

File structure: apps/ml/
  main.py (FastAPI app)
  routers/
    recommendations.py
    embeddings.py
    health.py
  services/
    faiss_service.py   (vector index management)
    lightgbm_service.py (ranking model)
    cold_start.py      (default recommendations)
  models/
    content_embedding.pkl
    learner_embedding.pkl
    ranking_model.pkl

Endpoints:
POST /recommendations/feed
  Input: { learnerId, enrolledTrackId, currentModuleId, limit: 20 }
  Process:
    1. Get learner embedding (from ClickHouse engagement history — last 90 days)
    2. FAISS ANN search: top 200 content vectors from learner's track
    3. Filter: remove already-completed content
    4. LightGBM re-rank with features:
       - content_completion_rate, content_save_rate, creator_tier
       - content_recency_days (exponential decay)
       - learner_concept_match (% of concepts learner has completed that content covers)
       - content_difficulty_match (learner level vs content difficulty)
    5. Apply feed composition rules:
       Sort into buckets: PROGRESSION (next unwatched modules), REINFORCEMENT (covered concepts),
       ADJACENT (track content not in current module), SOCIAL (cohort/creator activity)
       Final mix: 40% PROG, 30% REINF, 20% ADJ, 10% SOCIAL
    6. Cold start (< 20 engagement events): return first 20 items from current module only
  Output: { items: [contentId, score, bucket, reason], coldStart: bool }

POST /recommendations/similar
  Input: { contentId, limit: 10, trackId }
  FAISS similarity search, same track filter

GET /health
  Returns: { status, faiss_index_size, model_loaded, last_trained }

Data pipeline (runs every 6 hours via cron job):
  1. Load content features from PostgreSQL (completion rates, save rates, etc.)
  2. Generate content embeddings: sentence-transformers on title + transcript
  3. Load learner engagement from ClickHouse (last 90 days events)
  4. Generate learner embeddings: weighted average of consumed content embeddings
  5. Rebuild FAISS flat index (L2 distance)
  6. Retrain LightGBM ranking model on (learner, content, engaged=1/0) triplets
  7. Save models to disk, reload in service

NestJS API calls FastAPI internally:
  Recommendation service in NestJS proxies to http://ml-service:8000/recommendations/feed
  Falls back to track-default (first 20 items by module order) if ML service unavailable
```

**DONE WHEN:** Feed endpoint returns ML-ranked results. Cold-start works correctly.
**TEST:** Unit tests on cold_start.py and bucket assignment. Integration: verify feed composition ratios.

---

## PHASE 3 STEPS (19–42)

Steps 19–42 cover: Neo4j skill graph, Arabic RTL layout, Kubernetes deployment,
Hire-a-Team full build, corporate training portal, franchise graduation system,
full GDPR deletion cascade, Saudi Blackboard LTI, and production hardening.

These steps follow the same pattern:
- Use the relevant SKILL from SKILLS.md
- Write tests before implementation
- No step starts until previous step's tests pass

**Generate steps 19–42 by prompting:**
"Using SKILLS.md and the patterns established in steps 1–18, generate the
step-by-step prompts for: [specific Phase 3 feature]. Follow the exact format:
WHAT, WHY, PROMPT, DONE WHEN, TEST."

---

## PRODUCTION LAUNCH CHECKLIST

Before any code goes to production:

Security:
- [ ] All SEC-001 through SEC-008 tests pass
- [ ] Penetration test completed by external party (or thorough internal OWASP audit)
- [ ] All secrets rotated from development values
- [ ] SSL certificates installed and auto-renewing
- [ ] CORS configured for production domains only
- [ ] Rate limiting confirmed active on all sensitive endpoints
- [ ] Content Security Policy headers set

Performance:
- [ ] All Core Web Vitals green on public pages (Lighthouse > 90)
- [ ] k6 load test: 1000 concurrent users, p95 < 500ms, error rate < 1%
- [ ] Database query times: all common queries < 50ms (Datadog APM)
- [ ] Feed endpoint < 200ms p95 (Redis cache active)

Data:
- [ ] PostgreSQL automated backups (daily, 30-day retention, tested restore)
- [ ] Prisma migrations applied cleanly
- [ ] Seed data removed from production
- [ ] GDPR deletion cascade tested

Monitoring:
- [ ] Datadog dashboards live (platform health, API performance, error rates)
- [ ] Sentry error tracking active for all services
- [ ] PagerDuty alerting configured for SEV1/SEV2 triggers
- [ ] Uptime monitor (Datadog Synthetics) running every minute

Payments:
- [ ] Stripe live keys (not test keys) in production
- [ ] JazzCash production credentials
- [ ] EasyPaisa production credentials
- [ ] Webhook endpoints registered in Stripe dashboard
- [ ] Test payment in production (immediately refund after)

Legal + Compliance:
- [ ] Privacy Policy published at /privacy
- [ ] Terms of Service published at /terms
- [ ] Content Policy published at /content-policy
- [ ] PSEB registration certificate available
- [ ] PSDA/NAVTTC affiliation documents in place
- [ ] Cookie consent banner live

