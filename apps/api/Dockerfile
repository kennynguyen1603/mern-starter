# syntax=docker/dockerfile:1.7
# Build from the repo root: docker build -f apps/api/Dockerfile .

# Keep these two in lockstep: the runner reuses the node binary built for
# this exact Alpine (musl/libstdc++) release.
ARG NODE_IMAGE=node:22-alpine3.24
ARG ALPINE_IMAGE=alpine:3.24

# ─── base: node + pnpm (build-time only) ─────────────────────────────────────
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
WORKDIR /repo

# ─── deps: install workspace deps from manifests only (cache-friendly) ───────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @mern/api... --ignore-scripts

# ─── builder: compile shared + api, then extract prod-only node_modules ──────
FROM deps AS builder
COPY packages/shared packages/shared
COPY apps/api apps/api
# @mern/shared ships raw .ts; compile it and point `main` at the JS output so
# the runtime never has to load TypeScript.
RUN pnpm --filter @mern/shared build \
 && pnpm --filter @mern/api build \
 && cd packages/shared \
 && npm pkg set main=./dist/index.js types=./dist/index.d.ts
# Prod deps only, minus files node never reads at runtime.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter @mern/api deploy --prod --legacy --ignore-scripts /out \
 && cp -r apps/api/dist /out/dist \
 && find /out/node_modules -type f \( -name '*.d.ts' -o -name '*.d.mts' \
      -o -name '*.d.cts' -o -name '*.map' -o -name '*.md' \) -delete
# Official binary ships with debug_info (~17MB); runtime doesn't need it.
RUN apk add --no-cache binutils && strip /usr/local/bin/node

# ─── runner: bare Alpine + node binary — no npm/yarn/corepack, non-root ──────
FROM ${ALPINE_IMAGE} AS runner
RUN apk add --no-cache libstdc++ \
 && addgroup -g 1000 -S node && adduser -u 1000 -S -G node -H -s /sbin/nologin node
COPY --from=builder /usr/local/bin/node /usr/local/bin/node
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=builder /out/package.json ./
COPY --from=builder /out/node_modules ./node_modules
COPY --from=builder /out/dist ./dist
# Winston writes rotating logs to ./src/logs — the only writable path.
RUN mkdir -p src/logs && chown node:node src/logs
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "require('net').connect(process.env.PORT,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"
CMD ["node", "dist/server.js"]
