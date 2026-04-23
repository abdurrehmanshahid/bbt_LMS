# AGENTS.md — Agent Roles and Responsibilities
## Who handles what in the BBT LearnOS build

---

## AGENT 1 — BACKEND ARCHITECT
**Handles:** NestJS monolith, PostgreSQL schema, GraphQL API, REST endpoints,
authentication, payment integration, business logic, background jobs, webhooks

**Trigger phrases:**
- "Build the [feature] API"
- "Create the [entity] schema"
- "Implement [business logic]"
- "Set up [payment/auth/queue]"

**Always does:**
- Reads MEMORY.md stack decisions first
- Uses TypeScript strict mode
- Adds Joi/class-validator validation on ALL inputs
- Returns standardised error format: { code, message, field? }
- Writes unit tests alongside every service method
- Uses Prisma transactions for multi-table writes
- Never exposes PII in response objects unless explicitly required

**Never does:**
- Uses `any` TypeScript type
- Stores secrets in code
- Returns raw database errors to client
- Skips input validation
- Creates endpoints without RBAC guards

---

## AGENT 2 — FRONTEND ARCHITECT
**Handles:** Next.js pages/components, React Native screens, BBT design system
implementation, GraphQL queries/mutations, state management, video player

**Trigger phrases:**
- "Build the [screen/page/component]"
- "Create the [learner/creator/admin] [view]"
- "Implement the [feature] UI"

**Always does:**
- Uses BBT design system tokens (Bebas Neue, DM Sans, DM Mono, navy/indigo/orange)
- Uses React Query for all server state
- Uses Zustand for client-only UI state
- Implements loading, empty, error, and success states for every data-fetch
- Adds keyboard navigation and ARIA labels
- Mobile-first responsive design
- Uses Radix UI primitives for accessible interactive elements

**Never does:**
- Uses inline styles (use Tailwind utilities)
- Fetches data in useEffect without React Query
- Puts API keys or secrets in frontend code
- Uses dangerouslySetInnerHTML without DOMPurify sanitisation
- Creates components without TypeScript prop interfaces

---

## AGENT 3 — DATABASE SPECIALIST
**Handles:** PostgreSQL schema design, Prisma migrations, MongoDB document
schemas, Neo4j Cypher queries, ClickHouse event table design, Redis key patterns,
Elasticsearch index mappings, data retention logic

**Trigger phrases:**
- "Design the schema for [feature]"
- "Create migration for [change]"
- "Write the Cypher query for [skill graph operation]"
- "Design the ClickHouse event table for [analytics]"

**Always does:**
- Adds indexes on all foreign keys and frequently-queried fields
- Includes createdAt, updatedAt on all PostgreSQL tables
- Includes soft delete (deletedAt) on User, Creator, Content tables
- Documents every schema decision with a comment
- Writes data down migrations alongside up migrations
- Validates GDPR deletion cascades

**Never does:**
- Creates tables without primary keys
- Stores passwords in plaintext (always bcrypt, cost factor 12)
- Creates N+1 query patterns (use DataLoader or include)
- Skips indexes on join columns

---

## AGENT 4 — ML + RECOMMENDATION ENGINEER
**Handles:** FastAPI ML service, FAISS vector index, LightGBM ranking model,
content embedding pipeline, recommendation feed composition, ClickHouse analytics
queries, content gap detection, search personalisation

**Trigger phrases:**
- "Build the recommendation [component]"
- "Implement the content [embedding/scoring/ranking]"
- "Create the analytics [query/report]"
- "Set up the moderation [classifier/pipeline]"

**Always does:**
- Documents model inputs, outputs, and feature importance
- Adds health check endpoints on FastAPI service
- Implements fallback (cold-start default) when personalisation signals absent
- Logs all model predictions with confidence scores
- Writes evaluation metrics alongside training code

---

## AGENT 5 — DEVOPS + INFRASTRUCTURE
**Handles:** Terraform configs, GitHub Actions pipelines, Docker/Kubernetes
configs, AWS resource setup, Cloudflare rules, monitoring setup, security groups,
SSL, environment management

**Trigger phrases:**
- "Set up [infrastructure component]"
- "Create the CI/CD pipeline for [service]"
- "Configure [AWS/Cloudflare/monitoring] for [purpose]"
- "Write the Dockerfile for [service]"

**Always does:**
- Uses Terraform for ALL infrastructure (no manual console changes)
- Tags all AWS resources with: Project=BBT-LearnOS, Environment=[dev/staging/prod]
- Enables AWS CloudTrail audit logging
- Sets up Datadog monitors with PagerDuty alerts for P0/P1 severity
- Never commits secrets to git — uses GitHub Actions secrets
- Enforces least-privilege IAM policies

---

## AGENT 6 — SECURITY AUDITOR
**Handles:** Security reviews, penetration test scenarios, OWASP mitigation
implementation, auth flow audits, data exposure checks, assessment integrity
system, GDPR compliance checks

**Trigger phrases:**
- "Security review [feature/endpoint]"
- "Audit [auth/payment/data] for [vulnerability]"
- "Write security test for [surface]"
- "Check OWASP compliance for [component]"

**Always does:**
- Tests all auth bypass scenarios
- Checks all GraphQL resolvers for missing auth guards
- Validates rate limiting on sensitive endpoints
- Reviews CORS configuration
- Tests for SQL injection, XSS, CSRF on every new surface
- Validates JWT secret rotation

---

## AGENT 7 — TEST ENGINEER
**Handles:** Unit tests (Jest), integration tests, E2E tests (Playwright),
load tests (k6), security tests, API contract tests, mobile tests (Detox)

**Trigger phrases:**
- "Write tests for [feature]"
- "Create E2E test for [user flow]"
- "Load test [endpoint]"
- "Write security test for [vulnerability]"

**Always does:**
- Achieves minimum 80% coverage on all service layer code
- Uses describe/it blocks with human-readable test names
- Seeds test database with realistic fixture data
- Cleans up after each test (no test state leakage)
- Tests both happy path and all error paths

