FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM deps AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
RUN apk add --no-cache openssl libc6-compat
RUN npm install -g prisma@5.22.0
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Fix permissions for global npm/prisma
RUN chown -R nextjs:nodejs /usr/local/lib/node_modules /usr/local/bin

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Create a storage directory for the SQLite database
RUN mkdir -p /app/db
RUN chown nextjs:nodejs /app/db

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Sometimes next.js puts the server.js inside a project folder in standalone
# This ensures it's in the root
RUN if [ -d "./tenet" ]; then cp -r ./tenet/. ./ && rm -rf ./tenet; fi

# Copy public folder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy prisma schema and the script
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts/start.sh ./start.sh

# Install dos2unix to fix potential Windows line endings and ensure script is executable
RUN apk add --no-cache dos2unix && \
    dos2unix ./start.sh && \
    chmod +x ./start.sh

# The database initialization needs to happen as the same user that runs the app
# to ensure the database file created is owned by nextjs
USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Use the startup script
CMD ["./start.sh"]
