FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm db:generate && pnpm --filter @wcc/shared build && pnpm --filter @wcc/worker build
