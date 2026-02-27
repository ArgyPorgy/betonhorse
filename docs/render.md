# Deploy BetOnHorse on Render

Deploy the full BetOnHorse app (frontend, backend, Redis) to Render.

## Prerequisites

- GitHub account with your BetOnHorse repo pushed
- [Render](https://render.com) account
- Deployed BetOnHorse smart contract on Sepolia
- Privy App ID from [Privy Dashboard](https://dashboard.privy.io)

## Quick Deploy (Blueprint)

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New** > **Blueprint**
3. Connect your GitHub repository
4. Render will detect `render.yaml` and create 3 services:
   - **betonhorse-redis** (Redis)
   - **betonhorse-backend** (Express API + Socket.IO)
   - **betonhorse-frontend** (Next.js)

5. Before deploying, add **Environment Variables** for each service (see below)
6. Click **Apply**

## Manual Deploy (Step by Step)

If Blueprint fails or you prefer manual setup:

### 1. Create Redis

1. **New** > **Redis**
2. Name: `betonhorse-redis`
3. Plan: **Free**
4. Create
5. Copy the **Internal Redis URL** (starts with `redis://`)

### 2. Create Backend Service

1. **New** > **Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Name:** `betonhorse-backend`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

4. **Environment Variables** (add these):

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `REDIS_URL` | *(paste Internal Redis URL from step 1)* |
   | `CORS_ORIGIN` | `https://betonhorse-frontend.onrender.com` *(update after frontend is created)* |
   | `CONTRACT_ADDRESS` | Your BetOnHorse contract address |
   | `OWNER_PRIVATE_KEY` | Your wallet private key (for race settlement) |
   | `SEPOLIA_RPC_URL` | `https://ethereum-sepolia-rpc.publicnode.com` |
   | `GROQ_API_KEY` | *(optional)* Your Groq API key |

5. Create Web Service
6. Note your backend URL: `https://betonhorse-backend.onrender.com`

### 3. Create Frontend Service

1. **New** > **Web Service**
2. Connect the same GitHub repo
3. Configure:
   - **Name:** `betonhorse-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Instance Type:** Free

4. **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `NEXT_PUBLIC_BACKEND_URL` | `https://betonhorse-backend.onrender.com` *(your backend URL)* |
   | `NEXT_PUBLIC_PRIVY_APP_ID` | Your Privy App ID |
   | `NEXT_PUBLIC_CONTRACT_ADDRESS` | Your BetOnHorse contract address |

5. Create Web Service

### 4. Update Backend CORS

1. Go to **betonhorse-backend** > **Environment**
2. Set `CORS_ORIGIN` to your frontend URL: `https://betonhorse-frontend.onrender.com`
3. Save (Render will redeploy)

## Environment Variables Reference

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | Yes | Redis connection string (from Render Redis) |
| `CORS_ORIGIN` | Yes | Frontend URL, e.g. `https://betonhorse-frontend.onrender.com` |
| `CONTRACT_ADDRESS` | Yes | BetOnHorse contract on Sepolia |
| `OWNER_PRIVATE_KEY` | Yes | Wallet private key for settling races |
| `SEPOLIA_RPC_URL` | No | Default: public Sepolia RPC |
| `GROQ_API_KEY` | No | For AI agent personalities |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_BACKEND_URL` | Yes | Backend URL, e.g. `https://betonhorse-backend.onrender.com` |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Yes | From Privy Dashboard |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Yes | Same as backend |

## Render-Specific Notes

### Port Binding

Render assigns `PORT` dynamically. The backend already uses `process.env.PORT` and binds to `0.0.0.0`.

### Free Tier Cold Starts

Free tier services spin down after ~15 minutes of inactivity. The first request may take 30–60 seconds. Consider upgrading to a paid plan for always-on.

### Privy Allowed Origins

Add your Render frontend URL to Privy Dashboard:

1. [Privy Dashboard](https://dashboard.privy.io) > Your App > Settings
2. **Allowed Origins** > Add: `https://betonhorse-frontend.onrender.com`

### WebSocket / Socket.IO

Render supports WebSockets. Socket.IO will work for real-time race updates.

## Troubleshooting

**Backend fails to start**
- Check `REDIS_URL` is set and valid
- Check logs: Backend service > Logs

**Frontend can't connect to backend**
- Verify `NEXT_PUBLIC_BACKEND_URL` matches your backend URL exactly
- Add backend URL to Privy allowed origins
- Check `CORS_ORIGIN` on backend matches frontend URL

**Socket.IO connection fails**
- Ensure both URLs use `https://` (Render uses HTTPS)
- Check browser console for CORS or mixed-content errors

**Redis connection refused**
- Use the **Internal Redis URL** from Render (not external)
- Internal URL format: `redis://red-xxxxx:6379`
- If Blueprint Redis linking fails, create Redis manually and add `REDIS_URL` to backend env

**Blueprint Redis linking error**
- If you see "unknown property" or Redis link fails, deploy manually (see Manual Deploy section)
- Create Redis first, copy its Internal URL, then create backend with `REDIS_URL` set

## URLs After Deploy

- **Frontend:** `https://betonhorse-frontend.onrender.com`
- **Backend API:** `https://betonhorse-backend.onrender.com`
- **Health check:** `https://betonhorse-backend.onrender.com/api/health`
