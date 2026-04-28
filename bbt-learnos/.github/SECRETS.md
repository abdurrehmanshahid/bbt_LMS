# GitHub Actions Secrets Reference

All secrets are stored in GitHub → Settings → Secrets and variables → Actions.

## Required for all workflows

| Secret | Description |
|--------|-------------|
| `AWS_ACCOUNT_ID` | 12-digit AWS account ID (e.g. `123456789012`) |
| `AWS_ACCESS_KEY_ID` | IAM key with ECR push + ECS update permissions |
| `AWS_SECRET_ACCESS_KEY` | IAM secret for the above key |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL for `#deployments` channel |

## Required for staging deploy

| Secret | Description |
|--------|-------------|
| `STAGING_API_URL` | e.g. `https://api.staging.bbt.edu.pk/api` |
| `STAGING_WEB_URL` | e.g. `https://staging.bbt.edu.pk` |
| `TEST_LEARNER_EMAIL` | Seeded test learner email for E2E tests |
| `TEST_LEARNER_PASSWORD` | Password for the above account |

## Required for production deploy

| Secret | Description |
|--------|-------------|
| `PROD_API_URL` | e.g. `https://api.bbt.edu.pk/api` |
| `PROD_WEB_URL` | e.g. `https://bbt.edu.pk` |
| `PROD_SUBNET_IDS` | Comma-separated private subnet IDs for migration task |
| `PROD_SG_ID` | Security group ID for migration task (DB access) |

## Runtime env vars (set in ECS Task Definitions, not here)

- `DATABASE_URL` — RDS PostgreSQL connection string
- `REDIS_URL` — ElastiCache Redis URL
- `JWT_SECRET` — min 32-char random string
- `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` — RS256 key pair (base64)
- `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` — Mux API credentials
- `MUX_WEBHOOK_SECRET` — Mux webhook signing secret
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Stripe credentials
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth
- `APPLE_CLIENT_ID` / `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` — Apple Sign In
- `AWS_SES_REGION` / `AWS_SES_FROM_EMAIL` — SES config
- `FIREBASE_SERVICE_ACCOUNT_JSON` — FCM push (base64 JSON)
- `ELASTICSEARCH_URL` — ES cluster URL
