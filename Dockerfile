FROM node:24-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=builder /app /app
RUN mkdir -p /app/data /app/backups
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && npm run start"]
