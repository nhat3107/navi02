# Helm deploy

Chart: `helm/navi/` (4 templates: apps, infra, ingress, config + secret + db-init job).

## Manual deploy (GitHub Actions)

1. Run **Docker Build & Push** on `main` (or ensure images exist on Docker Hub).
2. Actions → **Deploy to Kubernetes** → `image_tag`: `latest` or `sha-<commit>`.

## Manual deploy (local)

```bash
export DOCKERHUB_USERNAME=myuser
export IMAGE_TAG=latest
export API_HOST=api.example.com
export USER_APP_HOST=app.example.com
export ADMIN_APP_HOST=admin.example.com
# …required secrets (see render-deploy-values.sh)

chmod +x helm/navi/render-deploy-values.sh
./helm/navi/render-deploy-values.sh > /tmp/deploy-values.yaml

helm upgrade --install navi ./helm/navi \
  --namespace navi --create-namespace \
  -f helm/navi/values.yaml \
  -f /tmp/deploy-values.yaml \
  --wait --timeout 15m
```

## GitHub Secrets

| Secret | Required |
|--------|----------|
| `KUBE_CONFIG` | yes |
| `DOCKERHUB_USERNAME` | yes |
| `DOCKERHUB_TOKEN` | yes (CD db-init push) |
| `JWT_ACCESS_SECRET`, `JWT_RESET_SECRET` | yes |
| `POSTGRES_USER`, `POSTGRES_PASSWORD` | yes |
| `MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD` | yes |
| `API_HOST`, `USER_APP_HOST`, `ADMIN_APP_HOST` | yes |
| `FRONTEND_ORIGIN`, `FRONTEND_URL`, `OPENAI_API_KEY` | recommended |
| OAuth, Cloudinary, Email, VideoSDK | optional |

DB URLs are built automatically in `render-deploy-values.sh`.
