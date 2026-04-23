# SKILLS.md — Technical Patterns and Reusable Prompts
## Proven patterns for building BBT LearnOS

---

## SKILL 01 — NestJS Module Scaffold

**Prompt to use:**
"Scaffold a NestJS module for [feature] with: module file, controller, service,
DTOs (create/update/response), Prisma repository pattern, class-validator
validation, JWT guard, RBAC decorator for [roles], and Jest unit tests for
the service. Use the BBT error response format: { code, message, field? }.
Follow strict TypeScript — no any types."

**Pattern:**
```
src/
  [feature]/
    [feature].module.ts
    [feature].controller.ts
    [feature].service.ts
    [feature].service.spec.ts
    dto/
      create-[feature].dto.ts
      update-[feature].dto.ts
      [feature]-response.dto.ts
    guards/
      [feature]-ownership.guard.ts  (if user-owned resource)
```

---

## SKILL 02 — Prisma Schema Pattern

**Prompt to use:**
"Add a Prisma model for [entity] with: UUID primary key, all required fields,
foreign key relationships to [related entities], createdAt/updatedAt timestamps,
soft delete (deletedAt nullable), appropriate indexes on all FK fields and
common query fields, and a migration file. Include down migration."

**Non-negotiables:**
- All PKs are UUID (not auto-increment int)
- All tables have createdAt, updatedAt
- User-owned tables have deletedAt (soft delete)
- Index every FK column
- No nullable fields without a documented reason

---

## SKILL 03 — GraphQL Resolver Pattern

**Prompt to use:**
"Create a GraphQL resolver for [entity] with: Query for list (with pagination
using cursor-based pagination), Query for single item, Mutation for create,
Mutation for update (partial), Mutation for delete (soft). Apply @UseGuards(JwtAuthGuard)
and @Roles([roles]) decorators. Use DataLoader for N+1 prevention on
[related entity] fields. Return BBT response types."

---

## SKILL 04 — Next.js Page with SSR + SEO

**Prompt to use:**
"Create a Next.js App Router page for [page type] at route [/path] with:
server-side data fetching using fetch() with appropriate caching strategy,
generateMetadata() function with title, description, Open Graph tags, and
JSON-LD structured data for [schema type], loading.tsx skeleton, error.tsx
boundary, and the BBT design system styling (Bebas Neue headers, DM Sans body,
navy/orange color palette). The page must achieve Core Web Vitals green."

---

## SKILL 05 — React Query + Zustand Pattern

**Prompt to use:**
"Create a client component for [feature] that: fetches [data] using React Query
with useQuery (include loading, error, empty states), handles [mutation] using
useMutation with optimistic updates and rollback, stores [UI state] in a Zustand
store slice. Use BBT design system components. Add skeleton loaders matching
the actual content layout."

---

## SKILL 06 — Video Player Integration

**Prompt to use:**
"Create a Video.js + HLS.js player component for BBT LearnOS that: initialises
with a Mux signed HLS URL, tracks play/pause/seek/speed-change/completion events
and sends them to /api/analytics/events, enforces session mode (locks to
progression content when active), shows completion at 90% watch threshold,
prevents right-click download, works offline via Expo download on mobile.
Style with BBT design tokens."

---

## SKILL 07 — JWT Auth + RBAC Pattern

**Prompt to use:**
"Implement JWT authentication for NestJS with: access token (15min, RS256,
claims: userId, role, tier, sessionId), refresh token rotation (stored httpOnly
SameSite=Strict Secure cookie), Passport.js local + Google + Apple strategies,
RBAC using a @Roles() decorator and RolesGuard, rate limiting on /auth/login
(10 req/min per IP via @nestjs/throttler), account lockout after 5 failed attempts
(store in Redis, 15min TTL), and device fingerprint stored on session start."

---

## SKILL 08 — Stripe + Local Payment Integration

**Prompt to use:**
"Implement payment integration for BBT LearnOS with: Stripe for global subscriptions
(create customer, create subscription, handle webhook events: payment_intent.succeeded,
customer.subscription.deleted, invoice.payment_failed), JazzCash for Pakistan mobile
money (hash generation per JazzCash API v2 spec), EasyPaisa for Pakistan (Telenor
API integration), idempotency keys on all payment creation calls, webhook signature
verification for Stripe, and a payment abstraction layer that routes by user geography."

---

## SKILL 09 — Mux Video Upload Pipeline

**Prompt to use:**
"Create the Mux video upload pipeline for BBT creator uploads: POST /api/creator/upload
creates a Mux direct upload URL (max 3GB, allowed MIME types: video/*), returns
upload URL to frontend, client uploads directly to Mux (not through API server),
Mux webhook POST /api/webhooks/mux processes video.asset.ready event to update
Content table with muxAssetId + playbackId + duration + thumbnail URL, error
handling for video.asset.errored. Include signed playback URL generation with
4-hour expiry. Content stays PENDING_MODERATION until admin approves."

---

## SKILL 10 — Content Moderation Pipeline

**Prompt to use:**
"Build the content moderation pipeline: (1) On Mux video.asset.ready webhook,
trigger AI pre-screen using AWS Rekognition (video moderation labels) and AWS
Comprehend (sentiment + entity on auto-transcript), store results with confidence
scores in ModerationRecord table. (2) If any confidence > 0.8 for EXPLICIT/VIOLENCE/
HATE_SPEECH auto-reject and notify creator. (3) Otherwise add to moderation queue
for human review. (4) Admin GET /api/admin/moderation returns queue sorted by:
flagged-first, then tier-ascending (Tier 1 last — lower risk). (5) POST
/api/admin/moderation/:id/approve or /reject with structured feedback JSON."

---

## SKILL 11 — Recommendation Feed Composition

**Prompt to use:**
"Implement the BBT recommendation feed for the learner home screen.
Feed composition rule: 40% progression content (next unwatched in current module),
30% reinforcement (different explanations of already-covered concepts in their track),
20% adjacent discovery (other content in their track they haven't seen),
10% social (cohort activity, creator announcements, live session promos).
Cold start: learner with < 20 engagement signals gets track-default progression
content only. All content must be from the learner's enrolled track — no cross-track
leakage. Use Redis to cache pre-computed feeds (rebuild every 30 min). Fall back
to track-default on cache miss."

---

## SKILL 12 — Staff Augmentation Platform

**Prompt to use:**
"Build the talent.bigbinarytech.com staff augmentation system:
(1) Employer POST /api/staff-aug/request with: skills[], duration, startDate,
budgetPerHour. (2) System queries Expert-tier learners matching skills from
SkillBadge table, filters by availability flag. (3) Returns top 3–5 profiles
(name, skill badges, project links, rate expectation) to employer within 48h.
(4) Employer selects candidate, agreement created. (5) Billing: employer pays
BBT bill rate (30–50% margin on pay rate). (6) Hire-a-Team: employer selects
multiple skill roles (1× Full Stack + 1× Cloud etc.), system assembles team from
Expert pool, team shown as a unit. Track all placements for credential credibility
reporting."

---

## SKILL 13 — LTI 1.3 Integration

**Prompt to use:**
"Implement LTI 1.3 + LTI Advantage tool provider for BBT LearnOS:
(1) OIDC launch flow: tool login endpoint, authentication response, deep linking.
(2) Deep Linking: institution admin embeds BBT track content into their LMS course.
(3) Assignment and Grade Services: when learner passes assessment in BBT, POST
grade back to LMS gradebook (score 0–1 normalised).
(4) Names and Role Provisioning: GET roster from LMS to auto-enroll students in BBT.
Use ltijs library (Node.js). Store platform registrations (client_id, auth_login_url,
auth_token_url, key_set_url) in LTI_Platform table. Support multiple simultaneous
LMS platforms (Moodle, Blackboard, Canvas)."

---

## SKILL 14 — Open Badges 3.0 Credential Issuance

**Prompt to use:**
"Implement Open Badges 3.0 credential issuance for BBT skill badges:
(1) When assessment passes (score >= 60), call BadgeService.issue(learnerId, conceptId, score).
(2) Create SkillBadge record with: id (UUID), learnerId, conceptId, score, issuedAt,
badgeJson (full OB3 JSON), verificationUrl.
(3) Badge JSON must conform to Open Badges 3.0 spec: type: ['VerifiableCredential', 'OpenBadgeCredential'],
issuer: BBT entity, credentialSubject with achievement, evidence (project URL).
(4) Sign badge with BBT private key (RS256).
(5) Public verification endpoint: GET /api/badges/:id/verify returns badge JSON.
(6) Employer API: POST /api/employer/verify with badgeId, returns verification status."

---

## SKILL 15 — GitHub Actions CI/CD Pipeline

**Prompt to use:**
"Create a GitHub Actions CI/CD pipeline for BBT LearnOS monorepo with:
(1) On PR: lint (ESLint + Prettier check) → type-check (tsc --noEmit strict) →
unit tests (Jest, fail if < 80% coverage on changed files) → build check.
(2) On merge to main: full test suite → build Docker images → push to AWS ECR →
deploy to staging (ECS/EKS) → run E2E tests (Playwright headless) → Slack notification.
(3) On manual approval: deploy staging image to production → post-deploy health check →
Datadog synthetic monitor check → rollback trigger if health check fails.
(4) All secrets from GitHub Actions secrets — never in code.
(5) Cache: pnpm store, Docker layers."

