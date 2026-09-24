FROM oven/bun:1-alpine

RUN apk add --no-cache git

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build
RUN cp node_modules/@orisun/eventstore-client/eventstore.proto ./eventstore.proto

EXPOSE 3000

CMD ["bun", "run", "dev"]
