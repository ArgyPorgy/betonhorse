# BetOnHorse - EigenCompute Single-Container Deployment
# TEE requirements: linux/amd64, root user, bind to 0.0.0.0

FROM --platform=linux/amd64 node:20-alpine

USER root

# Install Redis
RUN apk add --no-cache redis

# ──────────────────────────────────────
# Backend
# ──────────────────────────────────────
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ ./

# ──────────────────────────────────────
# Frontend - Build
# ──────────────────────────────────────
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN apk add --no-cache libc6-compat python3 make g++ && \
    npm install --ignore-scripts && \
    npm rebuild bufferutil utf-8-validate 2>/dev/null || true

COPY frontend/ ./

# Build args (pass at build time; empty defaults for EigenCompute env injection)
ARG NEXT_PUBLIC_PRIVY_APP_ID=""
ARG NEXT_PUBLIC_BACKEND_URL=""
ARG NEXT_PUBLIC_CONTRACT_ADDRESS=""

ENV NEXT_PUBLIC_PRIVY_APP_ID=$NEXT_PUBLIC_PRIVY_APP_ID
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_CONTRACT_ADDRESS=$NEXT_PUBLIC_CONTRACT_ADDRESS

RUN npm run build

# ──────────────────────────────────────
# Runtime
# ──────────────────────────────────────
WORKDIR /app

COPY docker/start-eigencompute.sh /app/start.sh
RUN chmod +x /app/start.sh

# Required for TEE - app must bind to 0.0.0.0
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Backend config
ENV REDIS_URL=redis://localhost:6379
ENV PORT_BACKEND=4000

EXPOSE 3000 4000

CMD ["/app/start.sh"]
