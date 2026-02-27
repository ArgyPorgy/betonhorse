# Deploy BetOnHorse to EigenCompute

Deploy BetOnHorse to a Trusted Execution Environment (TEE) using EigenCompute.

## Prerequisites

- [Docker](https://docker.com) installed
- [ecloud CLI](https://www.npmjs.com/package/@layr-labs/ecloud-cli) installed
- Testnet or Mainnet ETH for deployment transactions

## 1. Install ecloud CLI

```bash
npm install -g @layr-labs/ecloud-cli
```

## 2. Docker Login

```bash
docker login
```

## 3. Authenticate with EigenCompute

**Option A: Use existing private key**
```bash
ecloud auth login
```

**Option B: Generate new key**
```bash
ecloud auth generate --store
```

**Use Sepolia testnet:**
```bash
ecloud compute env set sepolia
```

**Check wallet:**
```bash
ecloud auth whoami
```

Get testnet ETH from [Google Cloud Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) or [Alchemy Faucet](https://sepoliafaucet.com/).

## 4. Subscribe to EigenCompute

```bash
ecloud billing subscribe
```

New customers receive $100 credit.

## 5. Configure Environment

Copy the example env file and fill in your values:

```bash
cp env.example .env
```

Edit `.env` with:

- `NEXT_PUBLIC_PRIVY_APP_ID` - From [Privy Dashboard](https://dashboard.privy.io)
- `NEXT_PUBLIC_CONTRACT_ADDRESS` - Your deployed BetOnHorse contract
- `CONTRACT_ADDRESS` - Same as above
- `OWNER_PRIVATE_KEY` - Your wallet private key (for race settlement)
- `SEPOLIA_RPC_URL` - Sepolia RPC URL
- `GROQ_API_KEY` - Optional, for AI agent personalities
- `CORS_ORIGIN` - Set after first deploy: `https://<your-app-ip>:3000` or `http://<your-app-ip>:3000`

## 6. Deploy

Use the EigenCompute Dockerfile:

```bash
# Use the EigenCompute Dockerfile for deployment
cp Dockerfile.eigencompute Dockerfile

# Deploy
ecloud compute app deploy
```

When prompted, select **Build and deploy from Dockerfile**.

The CLI will:

1. Build the image (Redis + Backend + Frontend in one container)
2. Push to your Docker registry
3. Deploy to a TEE instance
4. Return app ID and instance IP

## 7. View Your App

```bash
ecloud compute app info
```

Access your app at:

- **Frontend:** `http://<instance-ip>:3000`
- **Backend API:** `http://<instance-ip>:4000`

## 8. Post-Deploy: Update CORS

After first deploy, set `CORS_ORIGIN` in your `.env` to your frontend URL:

```
CORS_ORIGIN=http://<instance-ip>:3000
```

Then redeploy:

```bash
ecloud compute app deploy
```

## Port Configuration

The app exposes:

- **3000** - Next.js frontend

- **4000** - Express backend (API + Socket.IO)

Both bind to `0.0.0.0` as required for TEE.

## Troubleshooting

**Docker build fails**

Ensure platform is set:

```dockerfile
FROM --platform=linux/amd64 node:20-alpine
```

**Deployment transaction fails**

Check ETH balance:

```bash
ecloud auth whoami
```

**Image push fails**

```bash
docker login
```

**App not starting**

```bash
ecloud compute app logs
```

Check:

- Port conflicts
- Missing env vars (CONTRACT_ADDRESS, OWNER_PRIVATE_KEY, etc.)
- Redis/backend startup order

## Architecture

- **Redis** - Race state, runs as daemon
- **Backend** - Express + Socket.IO on port 4000
- **Frontend** - Next.js standalone on port 3000

Backend URL is auto-detected when frontend and backend share the same host (same-host deployment).
