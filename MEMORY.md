# MEMORY.md — Locked Decisions
## These NEVER change without explicit founder approval

---

## TECH STACK (LOCKED — NO SUBSTITUTIONS)

| Layer | Technology | Why Locked |
|---|---|---|
| Web Frontend | Next.js 14 + TypeScript | SSR mandatory for discovery surface |
| Mobile | React Native + Expo | OTA updates, code sharing with web |
| Components | Radix UI + Tailwind + BBT Design System | Brand-enforced, accessible |
| State | Zustand + React Query | Server vs client state separation |
| Video Player | Video.js + HLS.js | Own engagement data, adaptive bitrate |
| Backend | NestJS + TypeScript | Modular monolith, DI, microservice-ready |
| API | GraphQL (Apollo) + REST for external | Optimal per surface |
| Primary DB | PostgreSQL + Prisma | ACID, type-safe, RLS multi-tenant |
| Document DB | MongoDB | Flexible content metadata |
| Graph DB | Neo4j | Skill graph traversal |
| Cache | Redis | Sessions, feeds, rate limits, rankings |
| Search | Elasticsearch | Ranked, personalised, learning-to-rank |
| Analytics | ClickHouse | OLAP column-store |
| ML Service | FastAPI + Python | Recommendations, moderation |
| Recommendations | FAISS + LightGBM | Two-stage retrieval + ranking |
| Moderation AI | AWS Rekognition + Comprehend | Multi-layer, human-in-loop |
| Video Infra | Mux | Transcoding + CDN — DO NOT BUILD THIS |
| Live Sessions | Daily.co | Managed WebRTC |
| Cloud | AWS + Cloudflare | Deepest services + global edge |
| Containers | Kubernetes (EKS) | Phase 2+ |
| Auth | Custom JWT + Passport.js | Own identity data |
| Payments | Stripe + JazzCash + EasyPaisa | Global + Pakistan local |
| Push | FCM via Expo | Standard, reliable |
| Email | AWS SES + React Email | Cheap, deliverable |
| Real-time | Socket.io + Redis Pub/Sub | Scalable WebSocket |
| CI/CD | GitHub Actions + Terraform | Automated quality gates |
| Monitoring | Datadog + Sentry | APM + error tracking |

---

## DESIGN SYSTEM (LOCKED)

Fonts:
- Bebas Neue — ALL display/hero text
- DM Sans 300/400/500/700 — ALL body text
- DM Mono 400/500 — ALL labels, code, metadata, monospace

Colors:
- Navy: #0d0d2e (primary background)
- Indigo: #2E3192 (secondary)
- Orange: #F7941D (accent, CTA, highlight)

Three visual themes (all must be supported):
1. Gradient/Colorful — marketing, viral content, social
2. White/Light — educational content, trust-building, editorial
3. Navy + White + Orange — institutional, platform identity, brand

---

## BUSINESS RULES (LOCKED)

- Absorption model: BBT hires top-tier graduates. Rest referred to employer partners.
- talent.bigbinarytech.com: Staff augmentation (bill $35–60/hr, pay $12–25/hr, 30–50% margin)
- Hire-a-Team UI: Employer selects skill mix, BBT assembles team from Expert pool
- Freemium: First 2 modules of any track + short-form content is always free
- Creator tiers: Community (Tier 1, short-form only) → Verified Educator (Tier 2) → Expert Mentor (Tier 3)
- Revenue split Tier 2: 70% creator / 30% BBT
- Revenue split Tier 3: 80% creator / 20% BBT
- Payout cycle: Monthly, minimum PKR 5,000 / USD 20
- Track-locked feeds: Learner ONLY sees content from their enrolled track
- Recommendation objective: progression, NOT engagement/watch time
- Feed composition: 40% progression, 30% reinforcement, 20% adjacent, 10% social
- Assessment pass threshold: 60% to unlock next module
- Cohort size: 12–20 learners per cohort
- Content moderation SLA: 24h Tier 1, 4h Tier 2/3
- TypeScript strict mode: MANDATORY everywhere, no exceptions
- All secrets in AWS Secrets Manager, never in code or .env committed to git
- LTI 1.3 certification: Required before any UAE/Saudi institutional sales meeting

---

## AFFILIATIONS (ALWAYS MENTION IN PUBLIC CONTENT)

- PSDA (Punjab Skills Development Authority)
- NAVTTC (National Vocational & Technical Training Commission)
- Cisco Networking Academy

---

## GEOGRAPHIC PRIORITY (LOCKED)

Phase 1: Pakistan (launch market)
Phase 2: MENA — UAE first (Dubai/Abu Dhabi), then Saudi Arabia
Phase 3: Global English

Payment stacks by geography:
- Pakistan: Stripe + JazzCash + EasyPaisa
- UAE/Saudi: Stripe (AED/SAR)
- Global: Stripe

