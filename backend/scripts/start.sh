#!/bin/sh
set -e

echo "=== Starting Auto Atendimento ==="

# Sync database schema (without force-reset to preserve data)
echo "Syncing database schema..."
npx prisma db push --skip-generate --accept-data-loss

# Run seed (uses upsert, so it won't duplicate data)
echo "Running seed..."
node dist/seed.js

# Start server
echo "Starting server..."
node dist/index.js
