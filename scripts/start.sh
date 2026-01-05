#!/bin/sh
set -e

# Run migrations or push schema to the database
echo "Checking database directory permissions..."
if [ ! -w "/app/db" ]; then
  echo "ERROR: /app/db is not writable. Please check permissions."
  ls -ld /app/db
  id
  exit 1
fi

echo "Initializing database..."
# Try with --skip-generate first, fallback to standard if flag not supported
prisma db push --accept-data-loss --skip-generate || prisma db push --accept-data-loss

# Start the application
echo "Starting application..."
if [ -f "server.js" ]; then
  node server.js
else
  echo "ERROR: server.js not found in /app"
  echo "Searching for server.js..."
  find /app -name server.js
  exit 1
fi
