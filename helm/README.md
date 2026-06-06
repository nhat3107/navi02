# Helm deploy

Chart: `helm/navi/` deploys the application stack into Kubernetes (HTTP ingress, no in-cluster TLS).

- **In-cluster:** Kafka + all app pods
- **External:** Postgres and Mongo (connection URLs in secrets)
- **Backend:** api-gateway, auth, user, chat, network, notification, ai
- **Frontend:** user-app, admin-app
- **Job:** db-init — Prisma `db push` against external Postgres (optional)

## CI/CD parity with local Docker

| Local (`.env` + `docker compose`) | GitHub |
|-----------------------------------|--------|
| `AUTH_DATABASE_URL`, etc. | Same secret names in **CD** |
| `VITE_API_URL`, `VITE_WS_ORIGIN` | **CI** secrets (baked into frontend images) |
| `FRONTEND_ORIGIN` (comma-separated) | **CD** secret |
| OAuth `*/auth/*/callback` (no `/api`) | **CD** secrets |
| `docker compose` builds all services | **CI** pushes images; **CD** deploys via Helm |

See `.env.docker.example` for local vars and `values-production.example.yaml` for Helm overrides.

### HTTP hosts (no TLS in cluster)

Use plain `http://` in all URLs unless TLS terminates outside the cluster:

| Secret | Example |
|--------|---------|
| `API_HOST` | `api.example.com` |
| `USER_APP_HOST` | `app.example.com` |
| `ADMIN_APP_HOST` | `admin.example.com` |
| `VITE_API_URL` (CI) | `http://api.example.com/api` |
| `VITE_WS_ORIGIN` (CI) | `http://api.example.com` |
| `FRONTEND_ORIGIN` (CD) | `http://app.example.com,http://admin.example.com` |
| `GOOGLE_CALLBACK_URL` (CD) | `http://api.example.com/auth/google/callback` |

## Application env ↔ CI/CD mapping

| Runtime `process.env` | Set by | GitHub / Helm source |
|----------------------|--------|----------------------|
| `DATABASE_URL` | Helm per-app | `AUTH_DATABASE_URL`, `USER_DATABASE_URL`, `CHAT_DATABASE_URL`, `NETWORK_DATABASE_URL`, `NOTIFICATION_DATABASE_URL` |
| `KAFKA_BROKERS` | Helm ConfigMap | `broker:9092` (in-cluster DNS; broker advertised listener matches) |
| `JWT_ACCESS_SECRET`, `JWT_RESET_SECRET` | Helm Secret | CD secrets |
| `FRONTEND_ORIGIN`, `OAUTH_*`, `GOOGLE_*`, `GH_*` | Helm Secret | CD secrets (api-gateway) |
| `EMAIL_*`, `CLOUDINARY_*`, `FRONTEND_URL` | Helm Secret | CD secrets (user-service) |
| `OPENAI_API_KEY` | Helm Secret | CD secret (ai-service) |
| `VIDEOSDK_*` | Helm Secret | CD secrets (api-gateway) |
| `NODE_ENV`, `PORT`, `CHAT_HTTP_PORT`, `COOKIE_SECURE`, `CLOUDINARY_*_FOLDER` | Helm ConfigMap | `values.yaml` |
| `VITE_API_URL`, `VITE_WS_ORIGIN`, `VITE_ENABLE_OAUTH` | Docker build args | **CI** secrets (frontend only) |

In production (`NODE_ENV=production`), services use injected env only — not `apps/*/.env` files.

`COOKIE_SECURE` must stay `false` for HTTP ingress. Set `true` only if TLS terminates before the browser.

## Kafka (in-cluster)

- Broker Service: `broker:9092` (same namespace DNS — no ClusterIP sync step).
- `KAFKA_BROKERS` and `KAFKA_ADVERTISED_LISTENERS` both use `broker:9092`.
- `infra.kafka.colocateApps: true` (default) prefers scheduling app pods on the broker node — helps on multi-node k3s/AWS where cross-node pod traffic is blocked. Set `false` once node-to-node traffic (UDP 8472 / SG rules) is confirmed.
- Backend services retry Kafka connect at startup (no init container).

## Database env naming

| Secret | Runtime env in pod | Service |
|--------|-------------------|---------|
| `AUTH_DATABASE_URL` | `DATABASE_URL` | auth-service |
| `USER_DATABASE_URL` | `DATABASE_URL` | user-service |
| `CHAT_DATABASE_URL` | `DATABASE_URL` | chat-service |
| `NETWORK_DATABASE_URL` | `DATABASE_URL` | network-service |
| `NOTIFICATION_DATABASE_URL` | `DATABASE_URL` | notification-service |

## GitHub CD (manual)

1. Set **CI** secrets (`VITE_*`, `DOCKERHUB_*`) and **CD** secrets (below).
2. Push to `main` → CI tests, builds, and pushes images.
3. Actions → **CD** → Run workflow (always deploys `latest` images from CI). CD renders overrides via `helm/navi/render-cd-values.sh`.

## GitHub Secrets

### CI

| Secret | Required |
|--------|----------|
| `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` | yes |
| `VITE_API_URL`, `VITE_WS_ORIGIN` | yes (must not be localhost on main) |
| `VITE_ENABLE_OAUTH` | optional |

### CD

| Secret | Required |
|--------|----------|
| `KUBE_CONFIG` | yes |
| `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` | yes |
| `AUTH_DATABASE_URL`, `USER_DATABASE_URL` | yes |
| `CHAT_DATABASE_URL`, `NETWORK_DATABASE_URL`, `NOTIFICATION_DATABASE_URL` | yes |
| `JWT_ACCESS_SECRET`, `JWT_RESET_SECRET` | yes |
| `API_HOST`, `USER_APP_HOST`, `ADMIN_APP_HOST` | yes |
| `FRONTEND_ORIGIN`, `FRONTEND_URL`, `OPENAI_API_KEY` | recommended |
| OAuth, Cloudinary, Email, VideoSDK | optional |
| `K8S_NAMESPACE` | optional (default `navi`) |

External DBs must exist (`auth_db`, `user_db`, Mongo DBs) and be reachable from the cluster.

Set `dbInit.enabled: false` in `values.yaml` if schemas are managed outside the cluster.

## Local deploy

```bash
helm upgrade --install navi ./helm/navi \
  --namespace navi --create-namespace \
  -f helm/navi/values.yaml \
  -f helm/navi/values-production.example.yaml \
  --wait --timeout 15m
```
