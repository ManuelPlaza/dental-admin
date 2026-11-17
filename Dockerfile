# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — deps: instala dependencias con el lockfile
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — builder: compila la app
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Las variables NEXT_PUBLIC_* se incrustan en el bundle del navegador durante
# `next build`; no se leen en runtime. Por eso entran como build args y no
# como environment del contenedor. next.config.js también las usa para armar
# el connect-src del CSP, que Next resuelve en tiempo de build.
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ARG NEXT_PUBLIC_INVENTORY_URL=http://localhost:8081
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_INVENTORY_URL=$NEXT_PUBLIC_INVENTORY_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — runner: imagen final, solo lo necesario para servir
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Mismo puerto que `npm run dev` para no romper el CORS del backend Go,
# que ya tiene http://localhost:3001 en su whitelist.
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# output: "standalone" genera .next/standalone con un server.js y solo las
# dependencias que el bundle realmente usa. public/ y .next/static se copian
# aparte porque el standalone no los incluye.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
