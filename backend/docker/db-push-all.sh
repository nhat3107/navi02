#!/bin/sh
set -eu

echo "Pushing auth-service schema..."
DATABASE_URL="${AUTH_DATABASE_URL:?AUTH_DATABASE_URL is required}" \
  npx prisma db push --config apps/auth-service/prisma.config.ts --accept-data-loss

echo "Pushing user-service schema..."
DATABASE_URL="${USER_DATABASE_URL:?USER_DATABASE_URL is required}" \
  npx prisma db push --config apps/user-service/prisma.config.ts --accept-data-loss

echo "Database schemas are up to date."
