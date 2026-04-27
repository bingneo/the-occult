FROM node:24 AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY . .

# Remove host node_modules that leak into build context (Windows symlinks)
RUN find /app -type d -name node_modules -prune -exec rm -rf {} + 2>/dev/null || true

RUN echo "node-linker=hoisted" >> .npmrc && pnpm install --frozen-lockfile

# Build API server
RUN pnpm --filter @workspace/api-server run build

# Build frontend
ENV PORT=80
ENV BASE_PATH=/
RUN pnpm --filter @workspace/the-occult run build

# Remove frontend-only packages to keep runner image small
RUN cd /app/node_modules && \
    rm -rf react-icons lucide-react date-fns react-day-picker typescript \
       @babel @esbuild @shikijs prettier drizzle-kit \
       lightningcss-linux-x64-gnu date-fns-jalali @tailwindcss \
       tailwindcss tailwind-merge clsx class-variance-authority \
       framer-motion @tanstack/react-query @vitejs/plugin-react \
       vite @replit/vite-plugin-cartographer @replit/vite-plugin-dev-banner \
       @replit/vite-plugin-runtime-error-modal @replit/connectors-sdk \
       xterm @xterm/addon-fit next-themes recharts sonner vaul \
       wouter cmdk input-otp react-resizable-panels embla-carousel-react \
       react-hook-form @hookform/resolvers react-day-picker tw-animate-css \
       @radix-ui 2>/dev/null || true && \
    find . -type d -name "@radix-ui" -exec rm -rf {} + 2>/dev/null || true && \
    find . -type d -name "@types" -exec rm -rf {} + 2>/dev/null || true && \
    find . -type d -name "esbuild" -exec rm -rf {} + 2>/dev/null || true

# ---------------------------------------------------------------------------
# API Server runner stage
# ---------------------------------------------------------------------------
FROM node:24-slim AS api-server
WORKDIR /app

COPY --from=builder /app/artifacts/api-server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "--enable-source-maps", "dist/index.mjs"]

# ---------------------------------------------------------------------------
# Frontend nginx runner stage
# ---------------------------------------------------------------------------
FROM nginx:1.30-alpine AS frontend

COPY --from=builder /app/artifacts/the-occult/dist/public /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
