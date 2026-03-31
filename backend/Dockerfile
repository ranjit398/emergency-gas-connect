FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
RUN mkdir -p logs
EXPOSE 5002
USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "-r", "tsconfig-paths/register", "dist/server.js"]