# Per-service build file for API Gateway.
# Run from backend/: docker build -f apps/api-gateway/Dockerfile -t navi-api-gateway .

ARG NODE_VERSION=22
ARG SERVICE=api-gateway

FROM node:${NODE_VERSION}-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
ARG SERVICE=api-gateway
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
ENV SERVICE=api-gateway
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/docker/service-entrypoint.sh ./docker/service-entrypoint.sh
RUN chmod +x ./docker/service-entrypoint.sh
USER node
EXPOSE 3000
CMD ["./docker/service-entrypoint.sh"]
