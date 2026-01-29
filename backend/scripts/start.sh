#!/bin/sh
set -e

echo "=== Starting Auto Atendimento ==="

# Sync database schema (force reset for clean state)
echo "Syncing database schema..."
echo "y" | npx prisma db push --force-reset --skip-generate --accept-data-loss

# Run seed
echo "Running seed..."
node dist/seed.js

# Start server
echo "Starting server..."
node dist/index.js
