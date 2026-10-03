# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable \
    && corepack prepare pnpm@9.15.9 --activate

COPY . .

RUN pnpm install --frozen-lockfile

ARG APP_NAME
ARG VITE_API_URL=http://localhost:8000
ARG VITE_CLIENT_URL=http://localhost:5174

RUN case "$APP_NAME" in \
      marketing|client-app|tenant-portal|platform-console) ;; \
      *) echo "Unsupported APP_NAME: $APP_NAME" >&2; exit 1 ;; \
    esac \
    && VITE_API_URL="$VITE_API_URL" \
       VITE_CLIENT_URL="$VITE_CLIENT_URL" \
       pnpm --filter "@housekit/$APP_NAME" build \
    && mkdir -p /app-output \
    && cp -R "apps/$APP_NAME/dist/." /app-output/

FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app-output/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
