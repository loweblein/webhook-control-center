FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @wcc/shared build && pnpm --filter @wcc/web build
EXPOSE 5173
