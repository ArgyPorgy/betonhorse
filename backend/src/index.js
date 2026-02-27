const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const Redis = require("ioredis");
const config = require("./config");
const { RaceManager } = require("./raceManager");
const { HORSES } = require("./horses");
const { AgentAI } = require("./agentAI");

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: config.CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json());

// Redis
const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) {
      console.log("⚠️  Redis unavailable, running without persistence");
      return null;
    }
    return Math.min(times * 200, 2000);
  },
});

redis.on("error", (err) => {
  console.log("[Redis] Error (non-fatal):", err.message);
});

redis.on("connect", () => {
  console.log("[Redis] Connected");
});

// Race Manager
const raceManager = new RaceManager(io, redis);

// ──────────────────────────────────────────────
// REST API
// ──────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

app.get("/api/horses", (req, res) => {
  res.json({
    horses: HORSES.map((h) => ({
      id: h.id,
      name: h.name,
      color: h.color,
      image: h.image,
      bio: h.bio,
      stats: h.stats,
      personality: AgentAI.getPersonality(h.id),
    })),
  });
});

app.get("/api/race/current", (req, res) => {
  res.json(raceManager.getCurrentState());
});

app.get("/api/race/history", async (req, res) => {
  try {
    const history = await redis.lrange("race:history", 0, 19);
    res.json({
      races: history.map((r) => JSON.parse(r)),
    });
  } catch {
    res.json({ races: [] });
  }
});

app.get("/api/config", (req, res) => {
  res.json({
    contractAddress: config.CONTRACT_ADDRESS,
    numHorses: config.NUM_HORSES,
    betWindowMs: config.BET_WINDOW_MS,
    raceDurationMs: config.RACE_DURATION_MS,
    raceIntervalMs: config.RACE_INTERVAL_MS,
    aiEnabled: AgentAI.isAIEnabled(),
  });
});

// AI Agent Commentary Endpoints
app.get("/api/agents/commentary/:raceId", async (req, res) => {
  try {
    const raceId = parseInt(req.params.raceId);
    const commentary = await AgentAI.getPreRaceCommentary(raceId);
    res.json({ commentary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/agents/reactions/:winnerId", async (req, res) => {
  try {
    const winnerId = parseInt(req.params.winnerId);
    const reactions = await AgentAI.getPostRaceReactions(winnerId);
    res.json({ reactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/agents/personality/:horseId", (req, res) => {
  const horseId = parseInt(req.params.horseId);
  const personality = AgentAI.getPersonality(horseId);
  const horse = HORSES.find((h) => h.id === horseId);
  res.json({
    horseId,
    horseName: horse?.name || "Unknown",
    personality,
  });
});

// AI Stats Analysis endpoint
app.get("/api/agents/stats/:horseId", async (req, res) => {
  try {
    const horseId = parseInt(req.params.horseId);
    const analysis = await AgentAI.getStatsAnalysis(horseId);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Race Prediction endpoint
app.get("/api/agents/prediction/:raceId", async (req, res) => {
  try {
    const raceId = parseInt(req.params.raceId);
    const prediction = await AgentAI.getRacePrediction(raceId);
    res.json(prediction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// Socket.IO
// ──────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Send current state on connect
  socket.emit("race:state", raceManager.getCurrentState());

  // Handle on-chain bet notification (frontend already sent tx)
  socket.on("bet:placed", (data) => {
    const { playerAddress, horseId, amount, txHash, raceId } = data;
    console.log(`[Bet] On-chain: ${playerAddress.slice(0, 8)}... Horse #${horseId}`);

    // Track the bet locally for race logic
    const result = raceManager.placeBet(playerAddress, horseId, amount);

    if (result.success) {
      socket.emit("bet:confirmed", { ...result, txHash });
      io.emit("bet:update", {
        raceId: raceId,
        totalPool: raceManager.currentRace?.totalPool || 0,
      });
    }
  });

  // Legacy bet:place handler (for backwards compatibility)
  socket.on("bet:place", (data) => {
    const { playerAddress, horseId, amount } = data;
    const result = raceManager.placeBet(playerAddress, horseId, amount);

    if (result.success) {
      socket.emit("bet:confirmed", result);
      io.emit("bet:update", {
        raceId: result.raceId,
        totalPool: raceManager.currentRace?.totalPool || 0,
      });
    } else {
      socket.emit("bet:error", result);
    }
  });

  socket.on("disconnect", () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// ──────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────

server.listen(config.PORT, "0.0.0.0", () => {
  console.log(`[Server] BetOnHorse Backend`);
  console.log(`[Server] Port: ${config.PORT}`);
  console.log(`[Server] Contract: ${config.CONTRACT_ADDRESS ? "Connected" : "Not configured"}`);
  console.log(`[Server] AI: ${AgentAI.isAIEnabled() ? "Groq API" : "Static"}`);

  // Start the race loop
  raceManager.startLoop();
});
