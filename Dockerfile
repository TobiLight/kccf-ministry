FROM oven/bun:1.3.14-alpine AS base

WORKDIR /app

FROM base AS dependencies

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS build

COPY tsconfig.json ./
COPY src ./src
COPY public ./public

RUN bun run css:build && bun run build

FROM dependencies AS development

ENV NODE_ENV=development
ENV PORT=3000

COPY tsconfig.json ./
COPY package.json ./
COPY scripts ./scripts
COPY src ./src
COPY public ./public
COPY tests ./tests

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD ["bun", "-e", "const response = await fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}/health`); process.exit(response.ok ? 0 : 1)"]

CMD ["bun", "run", "scripts/dev.ts"]

FROM base AS production

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/public ./public
COPY --from=build /app/dist ./dist

USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["bun", "-e", "const response = await fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}/health`); process.exit(response.ok ? 0 : 1)"]

CMD ["bun", "dist/index.js"]
