#!/bin/sh
# Writes deploy override values to stdout for `helm upgrade -f`.
# Required env: DOCKERHUB_USERNAME, JWT_ACCESS_SECRET, JWT_RESET_SECRET,
# API_HOST, USER_APP_HOST, ADMIN_APP_HOST, and database URLs.
set -eu

NS="${K8S_NAMESPACE:-navi}"
REG="${DOCKERHUB_USERNAME:?DOCKERHUB_USERNAME required}"
TAG="${IMAGE_TAG:-latest}"
STAMP="${DEPLOY_STAMP:-0}"

yaml_quote() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

# HTTPS origins for CORS + secure cookies (upgrade http:// if secrets still use it).
if [ -n "${FRONTEND_ORIGIN:-}" ]; then
  FRONTEND_ORIGIN="$(printf '%s' "$FRONTEND_ORIGIN" | sed 's|http://|https://|g')"
elif [ -n "${USER_APP_HOST:-}" ] && [ -n "${ADMIN_APP_HOST:-}" ]; then
  FRONTEND_ORIGIN="https://${USER_APP_HOST},https://${ADMIN_APP_HOST}"
else
  FRONTEND_ORIGIN=""
fi
COOKIE_SECURE="${COOKIE_SECURE:-true}"

cat <<EOF
namespace: ${NS}
deploy:
  stamp: "${STAMP}"
image:
  registry: ${REG}
  tag: ${TAG}
  pullPolicy: Always
config:
  COOKIE_SECURE: "${COOKIE_SECURE}"
ingress:
  enabled: true
  apiHost: ${API_HOST:?API_HOST required}
  userAppHost: ${USER_APP_HOST:?USER_APP_HOST required}
  adminAppHost: ${ADMIN_APP_HOST:?ADMIN_APP_HOST required}
secrets:
  JWT_ACCESS_SECRET: "$(yaml_quote "${JWT_ACCESS_SECRET:?JWT_ACCESS_SECRET required}")"
  JWT_RESET_SECRET: "$(yaml_quote "${JWT_RESET_SECRET:?JWT_RESET_SECRET required}")"
  AUTH_DATABASE_URL: "$(yaml_quote "${AUTH_DATABASE_URL:?AUTH_DATABASE_URL required}")"
  USER_DATABASE_URL: "$(yaml_quote "${USER_DATABASE_URL:?USER_DATABASE_URL required}")"
  CHAT_DATABASE_URL: "$(yaml_quote "${CHAT_DATABASE_URL:?CHAT_DATABASE_URL required}")"
  NETWORK_DATABASE_URL: "$(yaml_quote "${NETWORK_DATABASE_URL:?NETWORK_DATABASE_URL required}")"
  NOTIFICATION_DATABASE_URL: "$(yaml_quote "${NOTIFICATION_DATABASE_URL:?NOTIFICATION_DATABASE_URL required}")"
  FRONTEND_ORIGIN: "$(yaml_quote "${FRONTEND_ORIGIN:-}")"
  OAUTH_FRONTEND_LOGIN_URL: "$(yaml_quote "${OAUTH_FRONTEND_LOGIN_URL:-}")"
  OAUTH_FRONTEND_REDIRECT_URL: "$(yaml_quote "${OAUTH_FRONTEND_REDIRECT_URL:-}")"
  GOOGLE_CLIENT_ID: "$(yaml_quote "${GOOGLE_CLIENT_ID:-}")"
  GOOGLE_CLIENT_SECRET: "$(yaml_quote "${GOOGLE_CLIENT_SECRET:-}")"
  GOOGLE_CALLBACK_URL: "$(yaml_quote "${GOOGLE_CALLBACK_URL:-}")"
  GH_CLIENT_ID: "$(yaml_quote "${GH_CLIENT_ID:-}")"
  GH_CLIENT_SECRET: "$(yaml_quote "${GH_CLIENT_SECRET:-}")"
  GH_CALLBACK_URL: "$(yaml_quote "${GH_CALLBACK_URL:-}")"
  VIDEOSDK_API_KEY: "$(yaml_quote "${VIDEOSDK_API_KEY:-}")"
  VIDEOSDK_SECRET: "$(yaml_quote "${VIDEOSDK_SECRET:-}")"
  EMAIL_USER: "$(yaml_quote "${EMAIL_USER:-admin@example.com}")"
  EMAIL_PASS: "$(yaml_quote "${EMAIL_PASS:-admin123}")"
  FRONTEND_URL: "$(yaml_quote "${FRONTEND_URL:-}")"
  CLOUDINARY_CLOUD_NAME: "$(yaml_quote "${CLOUDINARY_CLOUD_NAME:-}")"
  CLOUDINARY_API_KEY: "$(yaml_quote "${CLOUDINARY_API_KEY:-}")"
  CLOUDINARY_API_SECRET: "$(yaml_quote "${CLOUDINARY_API_SECRET:-}")"
  OPENAI_API_KEY: "$(yaml_quote "${OPENAI_API_KEY:-}")"
  ADMIN_SEED_EMAIL: "$(yaml_quote "${ADMIN_SEED_EMAIL:-admin@navi.test}")"
  ADMIN_SEED_PASSWORD: "$(yaml_quote "${ADMIN_SEED_PASSWORD:-Admin123!}")"
EOF
