# syntax=docker/dockerfile:1.7
# Build from the repo root: docker build -f apps/web/Dockerfile .

# ─── base: node + pnpm (build-time only) ─────────────────────────────────────
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
WORKDIR /repo

# ─── deps: install workspace deps from manifests only (cache-friendly) ───────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @mern/web... --ignore-scripts

# ─── builder: type-check + vite build to static files ────────────────────────
FROM deps AS builder
# Inlined into the bundle at build time — must not be a secret.
ARG VITE_ACCESS_TOKEN_EXP_MS=900000
ENV VITE_ACCESS_TOKEN_EXP_MS=$VITE_ACCESS_TOKEN_EXP_MS
COPY packages/shared packages/shared
COPY packages/ui packages/ui
COPY apps/web apps/web
RUN pnpm --filter @mern/web build

# ─── runner: static nginx, non-root (uid 101), no node_modules at all ────────
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runner
COPY --chown=root:root apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=root:root /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
