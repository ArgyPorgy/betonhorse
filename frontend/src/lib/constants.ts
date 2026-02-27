// Auto-detect backend URL when on same host (e.g. EigenCompute single-container deploy)
export const BACKEND_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_BACKEND_URL ||
        `${window.location.protocol}//${window.location.hostname}:4000`)
    : (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000");

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

export const PRIVY_APP_ID =
  process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

export const SEPOLIA_CHAIN_ID = 11155111;

export const MIN_BET = 0.001; // ETH
export const MAX_BET = 1; // ETH
export const PAYOUT_MULTIPLIER = 2; // 2x

export const HORSE_NAMES = ["Alexa", "Dan", "Peter", "Robert", "Robin", "Tommy"];

export const HORSE_COLORS = [
  "#e74c3c", // Alexa - Red
  "#2c3e50", // Dan - Dark
  "#f39c12", // Peter - Gold
  "#27ae60", // Robert - Green
  "#8e44ad", // Robin - Purple
  "#3498db", // Tommy - Blue
];

export const CONTRACT_ABI = [
  {
    inputs: [
      { name: "_raceId", type: "uint256" },
      { name: "_horseId", type: "uint8" },
    ],
    name: "placeBet",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "_betId", type: "uint256" }],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_raceId", type: "uint256" }],
    name: "getRace",
    outputs: [
      {
        components: [
          { name: "id", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "lockedAt", type: "uint256" },
          { name: "settledAt", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "winningHorse", type: "uint8" },
          { name: "totalPool", type: "uint256" },
          { name: "seedHash", type: "bytes32" },
          { name: "revealedSeed", type: "bytes32" },
        ],
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_player", type: "address" }],
    name: "getPlayerBets",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_betId", type: "uint256" }],
    name: "getBet",
    outputs: [
      {
        components: [
          { name: "player", type: "address" },
          { name: "raceId", type: "uint256" },
          { name: "horseId", type: "uint8" },
          { name: "amount", type: "uint256" },
          { name: "claimed", type: "bool" },
        ],
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
