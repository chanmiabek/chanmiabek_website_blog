FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV SQLITE_DATABASE_PATH=/app/data/content.sqlite
ENV UPLOAD_DIR=/app/public/images/uploads
ENV UPLOAD_PUBLIC_PATH=/images/uploads

COPY --from=builder /app ./

RUN mkdir -p /app/data /app/public/images/uploads

EXPOSE 3000
CMD ["npm", "run", "start"]
