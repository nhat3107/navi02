#!/bin/sh
set -eu

SERVICE="$1"

case "$SERVICE" in
  auth-service)
    npx prisma generate --config apps/auth-service/prisma.config.ts
    ;;
  user-service)
    npx prisma generate --config apps/user-service/prisma.config.ts
    ;;
  *)
    ;;
esac
