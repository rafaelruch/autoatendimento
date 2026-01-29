#!/bin/sh
set -e

echo "=== Starting Auto Atendimento ==="

# Sync database schema (without force-reset to preserve data)
echo "Syncing database schema..."
npx prisma db push --skip-generate --accept-data-loss

# Start server
echo "Starting server..."
node dist/index.js
