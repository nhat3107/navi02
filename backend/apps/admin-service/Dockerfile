# Per-service build file for Admin Service (standalone stub; admin APIs are routed via API Gateway).
# Run from backend/: docker build -f apps/admin-service/Dockerfile -t navi-admin-service .

ARG NODE_VERSION=22
ARG SERVICE=admin-service

FROM node:${NODE_VERSION}-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
ARG SERVICE=admin-service
WORKDIR /app
COPY . .
RUN sed -i 's/\r$//' docker/prisma-generate.sh docker/service-entrypoint.sh
RUN chmod +x docker/prisma-generate.sh docker/service-entrypoint.sh
RUN mkdir -p node_modules/.prisma
RUN ./docker/prisma-generate.sh "${SERVICE}"
RUN npx nest build "${SERVICE}"

FROM node:${NODE_VERSION}-alpine AS production
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production
ENV SERVICE=admin-service
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/docker/service-entrypoint.sh ./docker/service-entrypoint.sh
RUN chmod +x ./docker/service-entrypoint.sh
USER node
EXPOSE 3000
CMD ["./docker/service-entrypoint.sh"]
