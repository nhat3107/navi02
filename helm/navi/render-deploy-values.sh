#!/bin/sh
# Writes deploy override values to stdout for `helm upgrade -f`.
# Required env: DOCKERHUB_USERNAME, JWT_ACCESS_SECRET, JWT_RESET_SECRET,
# AUTH_DATABASE_URL, USER_DATABASE_URL, CHAT_DATABASE_URL, NETWORK_DATABASE_URL,
# NOTIFICATION_DATABASE_URL (external Postgres / Mongo connection strings).
set -eu

NS="${K8S_NAMESPACE:-navi}"
REG="${DOCKERHUB_USERNAME:?DOCKERHUB_USERNAME required}"

yaml_quote() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cat <<EOF
namespace: ${NS}
image:
  registry: ${REG}
  tag: latest
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
EOF
