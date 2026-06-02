#!/bin/sh
set -eu

if [ "${RUN_DB_PUSH:-false}" = "true" ]; then
  case "${SERVICE}" in
    auth-service)
      npx prisma db push --config apps/auth-service/prisma.config.ts --accept-data-loss
      ;;
    user-service)
      npx prisma db push --config apps/user-service/prisma.config.ts --accept-data-loss
      ;;
  esac
fi

exec node "dist/apps/${SERVICE}/main.js"
