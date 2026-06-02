# User app — multi-stage build (Node → Nginx).
# Run from frontend/: docker build -f user/Dockerfile -t navi-user-app .

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
COPY user/package.json user/package-lock.json ./
RUN npm ci
COPY user/ .

ARG VITE_API_URL=http://localhost:3000/api
ARG VITE_WS_ORIGIN=http://localhost:3000
ARG VITE_ENABLE_OAUTH=false
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_ORIGIN=${VITE_WS_ORIGIN}
ENV VITE_ENABLE_OAUTH=${VITE_ENABLE_OAUTH}

RUN npm run build

FROM nginx:1.27-alpine AS production
COPY nginx/spa.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
