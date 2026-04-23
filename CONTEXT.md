# CONTEXT.md — Current Build State
## Updated after every session

---

## CURRENT PHASE: PRE-BUILD (Phase 0)

Status: Architecture defined. No code written yet.
Next action: Begin Phase 1 build sequence (see BUILD.md Step 1)

---

## PHASE 1 TARGET (Months 0–4)

What Phase 1 must deliver to go live:

### Backend (NestJS)
- [ ] Monorepo scaffold (apps/api, apps/web, apps/mobile, packages/shared)
- [ ] Auth module (JWT, Passport.js, Google OAuth, Apple Sign In)
- [ ] User module (roles: learner, creator, admin, employer, franchise)
- [ ] Track module (7 tracks, modules, concepts, prerequisites)
- [ ] Content module (upload, Mux integration, transcript, metadata)
- [ ] Enrollment module (subscribe, enroll, progress tracking)
- [ ] Assessment module (submit, grade, badge issuance)
- [ ] Cohort module (assign, manage, activity feed)
- [ ] Moderation module (queue, AI pre-screen, human review workflow)
- [ ] Payment module (Stripe global, JazzCash, EasyPaisa)
- [ ] Creator module (tiers, analytics, payout)
- [ ] Franchise module (locations, compliance, revenue split)
- [ ] Notification module (FCM push, SES email, in-app)
- [ ] Admin module (platform health, user management, content ops)

### Frontend (Next.js)
- [ ] Design system implemented (BBT tokens in Tailwind config)
- [ ] Public surface (homepage, 7 track pages, concept pages, creator profiles)
- [ ] Auth flows (signup, login, OAuth, forgot password)
- [ ] Learner dashboard (feed, track progress, cohort, portfolio)
- [ ] Video player (Video.js + HLS.js, progress tracking, session mode)
- [ ] Assessment flow (MCQ + project submission + peer review)
- [ ] Creator dashboard (upload, course builder, analytics, revenue)
- [ ] Admin dashboard (moderation queue, user management, health metrics)
- [ ] Franchise dashboard (enrolment, compliance, revenue split)

### Mobile (React Native + Expo)
- [ ] Learner app (feed, video player, assessment, cohort, notifications)
- [ ] Creator app (upload, analytics, notifications)

### Infrastructure
- [ ] GitHub repo with monorepo structure
- [ ] GitHub Actions CI/CD (test → build → deploy)
- [ ] PostgreSQL on AWS RDS
- [ ] Redis on ElastiCache
- [ ] Cloudflare CDN configured
- [ ] Mux account and webhook setup
- [ ] Stripe + JazzCash + EasyPaisa connected
- [ ] FCM + AWS SES configured
- [ ] Datadog + Sentry connected
- [ ] Staging environment live

---

## PHASE 2 TARGET (Months 4–8)

- [ ] Elasticsearch (internal search with learning-to-rank)
- [ ] MongoDB (content metadata migration from PostgreSQL JSONB)
- [ ] ClickHouse (analytics event stream)
- [ ] ML Service FastAPI (basic collaborative filtering recommendations)
- [ ] Employer end (talent search, badge verification API, job board)
- [ ] LTI 1.3 certification (1EdTech membership + cert suite)
- [ ] Staff augmentation platform (talent.bigbinarytech.com)
- [ ] Live sessions (Daily.co integration)
- [ ] Creator Tier 3 (Expert Mentor features)
- [ ] AI moderation layer (AWS Rekognition + Comprehend)

---

## PHASE 3 TARGET (Months 8–18)

- [ ] Neo4j skill graph (full prerequisite chain, readiness detection)
- [ ] FAISS + LightGBM full recommendation pipeline
- [ ] Kubernetes migration (EKS)
- [ ] Hire-a-Team UI (talent.bigbinarytech.com full feature)
- [ ] Franchise dashboard full (compliance, graduation events)
- [ ] Arabic RTL layout (UAE/Saudi market)
- [ ] Multilingual metadata (Arabic, Urdu, Indonesian)
- [ ] Saudi Blackboard LTI integration
- [ ] Corporate training portal (bulk seats, manager dashboard)

---

## LOCKED ARCHITECTURAL DECISIONS

1. Monolith first — no microservices until Phase 3
2. PostgreSQL for all relational data (no MongoDB for core entities)
3. Redis Pub/Sub behind Socket.io (not Kafka at this scale)
4. Mux for video — do not build transcoding pipeline
5. Custom JWT (not Auth0/Clerk) — own the identity data
6. LTI 1.3 certification starts Phase 2 Month 1 — blocks institutional sales
7. TypeScript strict: true everywhere — no exceptions
8. All background jobs via BullMQ (Redis-backed) in Phase 1
9. Server-side rendering (Next.js App Router) for all public pages
10. Open Badges 3.0 for all skill credentials

