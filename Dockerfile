# ── Stage 1: Build ──────────────────────────────────────────────
FROM oven/bun:1 AS builder

# Copy Node.js binary from the official image so next build runs under Node.js (averting Bun's React 19 build worker compatibility crash)
COPY --from=node:20-slim /usr/local/bin/node /usr/local/bin/node

WORKDIR /app

# Build-time deps for native modules (sharp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Install deps first (better layer caching)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source (db/custom.db included so we can sync its schema)
COPY . .

# Generate Prisma client, then build Next.js standalone.
# The `build` script also copies .next/static + public into standalone/.
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run db:generate && bun run build

# Sync the bundled DB's schema (mirrors .zscripts/build.sh)
RUN DATABASE_URL="file:/app/db/custom.db" bun run db:push --accept-data-loss


# ── Stage 2: Runtime ────────────────────────────────────────────
# Pull the caddy binary from the official image
FROM caddy:2-alpine AS caddy-src

FROM oven/bun:1 AS runner

WORKDIR /app

# Runtime deps for sharp + the caddy binary
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libvips-dev \
    && rm -rf /var/lib/apt/lists/*
COPY --from=caddy-src /usr/bin/caddy /usr/bin/caddy

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# start.sh expects this exact layout:
#   /app/start.sh
#   /app/next-service-dist/server.js   (+ .next/static, public bundled in)
#   /app/db/custom.db
#   /app/Caddyfile
COPY --from=builder /app/.next/standalone ./next-service-dist
COPY --from=builder /app/db               ./db
COPY --from=builder /app/prisma           ./prisma

COPY Caddyfile          ./Caddyfile
COPY .zscripts/start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 81

CMD ["sh", "./start.sh"]
