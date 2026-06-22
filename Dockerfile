FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json postcss.config.js tailwind.config.ts vite.config.ts ./
COPY index.html ./
COPY public ./public
COPY src ./src
COPY migrations ./migrations
COPY scripts ./scripts
RUN npm run build && npm run build:server

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/scripts ./scripts
RUN npm ci --omit=dev
EXPOSE 8787
CMD sh -c "node scripts/migrate.mjs && node dist-server/server.node.js"
