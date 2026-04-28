# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

ARG NODE_VERSION=20
RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY apps/api/package.json ./apps/api/

# Install all deps (including devDeps needed for build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY packages/config ./packages/config
COPY apps/api ./apps/api

# Generate Prisma client
RUN pnpm --filter @bbt/api exec prisma generate

# Build NestJS
RUN pnpm --filter @bbt/api run build

# Prune dev deps
RUN pnpm --filter @bbt/api --prod deploy /app-prod

# Copy generated Prisma client into pruned install
RUN cp -r /app/apps/api/node_modules/.prisma /app-prod/node_modules/.prisma || true
RUN cp -r /app/apps/api/node_modules/@prisma /app-prod/node_modules/@prisma || true

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN addgroup -S bbt && adduser -S bbt -G bbt

WORKDIR /app

# Copy pruned production node_modules + compiled output
COPY --from=builder --chown=bbt:bbt /app-prod/node_modules ./node_modules
COPY --from=builder --chown=bbt:bbt /app/apps/api/dist ./dist
COPY --from=builder --chown=bbt:bbt /app/apps/api/prisma ./prisma

USER bbt

EXPOSE 4000

ENV NODE_ENV=production \
    PORT=4000

CMD ["node", "dist/main"]
