# syntax=docker/dockerfile:1.7
#
# Multi-stage NestJS monorepo image.
# Build a specific microservice target, e.g.:
#   docker build --target api-gateway -t navi-api-gateway .
#   docker build --target auth-service -t navi-auth-service .
#
# See also per-service Dockerfiles under apps/*/Dockerfile.

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
ARG SERVICE
WORKDIR /app
COPY . .
RUN sed -i 's/\r$//' docker/prisma-generate.sh docker/service-entrypoint.sh
RUN chmod +x docker/prisma-generate.sh docker/service-entrypoint.sh
RUN mkdir -p node_modules/.prisma
RUN ./docker/prisma-generate.sh "${SERVICE}"
RUN npx nest build "${SERVICE}"

FROM node:${NODE_VERSION}-alpine AS production-base
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/docker/service-entrypoint.sh ./docker/service-entrypoint.sh
RUN chmod +x ./docker/service-entrypoint.sh
USER node

FROM production-base AS api-gateway
ENV SERVICE=api-gateway
EXPOSE 3000
CMD ["./docker/service-entrypoint.sh"]

FROM production-base AS auth-service
ENV SERVICE=auth-service
CMD ["./docker/service-entrypoint.sh"]

FROM production-base AS user-service
ENV SERVICE=user-service
CMD ["./docker/service-entrypoint.sh"]

FROM production-base AS chat-service
ENV SERVICE=chat-service
ENV CHAT_HTTP_PORT=4030
EXPOSE 4030
CMD ["./docker/service-entrypoint.sh"]

FROM production-base AS network-service
ENV SERVICE=network-service
CMD ["./docker/service-entrypoint.sh"]

FROM production-base AS notification-service
ENV SERVICE=notification-service
CMD ["./docker/service-entrypoint.sh"]

FROM production-base AS ai-service
ENV SERVICE=ai-service
CMD ["./docker/service-entrypoint.sh"]

FROM production-base AS admin-service
ENV SERVICE=admin-service
EXPOSE 3000
CMD ["./docker/service-entrypoint.sh"]
