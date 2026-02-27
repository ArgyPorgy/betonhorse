#!/bin/sh
set -e

# Start Redis in background (required for TEE - run as root)
redis-server --daemonize yes

# Wait for Redis to be ready
sleep 2

# Start backend in background (bind to 0.0.0.0)
cd /app/backend && PORT=4000 REDIS_URL=redis://localhost:6379 node src/index.js &

# Wait for backend to bind
sleep 3

# Start frontend (main process - keeps container alive, bind to 0.0.0.0)
cd /app/frontend && PORT=3000 HOSTNAME=0.0.0.0 node server.js
