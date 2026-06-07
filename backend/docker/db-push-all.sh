#!/bin/sh
set -eu

echo "Pushing auth-service schema..."
DATABASE_URL="${AUTH_DATABASE_URL:?AUTH_DATABASE_URL is required}" \
  npx prisma db push --config apps/auth-service/prisma.config.ts --accept-data-loss

echo "Pushing user-service schema..."
DATABASE_URL="${USER_DATABASE_URL:?USER_DATABASE_URL is required}" \
  npx prisma db push --config apps/user-service/prisma.config.ts --accept-data-loss

if [ "${SEED_ADMIN:-true}" != "false" ]; then
  echo "Seeding admin account..."
  DATABASE_URL="${AUTH_DATABASE_URL:?AUTH_DATABASE_URL is required}" \
    npx prisma generate --config apps/auth-service/prisma.config.ts
  DATABASE_URL="${AUTH_DATABASE_URL}" \
    ADMIN_SEED_EMAIL="${ADMIN_SEED_EMAIL:-admin@navi.test}" \
    ADMIN_SEED_PASSWORD="${ADMIN_SEED_PASSWORD:-Admin123!}" \
    npx tsx apps/auth-service/scripts/seed-admin.ts
fi

echo "Database schemas are up to date."
