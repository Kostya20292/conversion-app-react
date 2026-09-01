# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
RUN npm install -g pnpm@11.5.2

FROM base AS build
WORKDIR /src
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages ./packages
RUN pnpm install --frozen-lockfile
COPY apps ./apps
RUN pnpm --filter @convertly/shared build \
  && pnpm --filter @convertly/api build \
  && pnpm --filter @convertly/web build \
  && pnpm --filter @convertly/api --prod deploy --legacy /out/api

FROM node:22-bookworm-slim AS runner
ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    HOME=/tmp \
    SAL_USE_VCLPLUGIN=svp \
    NODE_ENV=production \
    PORT=3000 \
    LISTEN_HOST=0.0.0.0 \
    STORAGE_ROOT=/app/storage \
    WEB_DIST=/app/web-dist

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-dejavu-core \
    fonts-liberation \
    libreoffice-writer-nogui \
  && rm -rf /var/lib/apt/lists/* \
  && soffice --version \
  && mkdir -p /app/storage /app/web-dist \
  && chown -R node:node /app

WORKDIR /app
USER node

COPY --from=build --chown=node:node /out/api ./
COPY --from=build --chown=node:node /src/apps/web/dist ./web-dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
