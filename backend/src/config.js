require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 4000,
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  SEPOLIA_RPC_URL:
    process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || "",
  OWNER_PRIVATE_KEY: process.env.OWNER_PRIVATE_KEY || "",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",

  // Groq AI for agent personalities (optional)
  GROQ_API_KEY: process.env.GROQ_API_KEY || "",

  // Race timing
  RACE_INTERVAL_MS: parseInt(process.env.RACE_INTERVAL_MS || "180000"), // 3 min total cycle
  BET_WINDOW_MS: parseInt(process.env.BET_WINDOW_MS || "120000"), // 2 min betting window
  RACE_DURATION_MS: parseInt(process.env.RACE_DURATION_MS || "30000"), // 30s animation

  // Horses
  NUM_HORSES: 6,
};
