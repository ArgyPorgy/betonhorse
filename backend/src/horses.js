/**
 * Horse Agent Definitions
 * Each horse is an "agent" with unique stats that influence race outcomes.
 * Stats are on a 0-100 scale.
 * Names and images match the PNGs in frontend/public/
 */

const HORSES = [
  {
    id: 0,
    name: "Alexa",
    color: "#e74c3c",
    image: "/alexa.png",
    bio: "A blazing fast sprinter with explosive acceleration. Struggles on longer races.",
    stats: {
      speed: 92,
      stamina: 55,
      consistency: 60,
      aggression: 85,
      luck: 50,
    },
  },
  {
    id: 1,
    name: "Dan",
    color: "#2c3e50",
    image: "/dan.png",
    bio: "The dark horse. Quiet and calculating, often surprises with late surges.",
    stats: {
      speed: 70,
      stamina: 85,
      consistency: 75,
      aggression: 40,
      luck: 80,
    },
  },
  {
    id: 2,
    name: "Peter",
    color: "#f39c12",
    image: "/peter.png",
    bio: "The crowd favorite. Consistent performer with a winning mentality.",
    stats: {
      speed: 78,
      stamina: 78,
      consistency: 90,
      aggression: 65,
      luck: 60,
    },
  },
  {
    id: 3,
    name: "Robert",
    color: "#27ae60",
    image: "/robert.png",
    bio: "Volatile as the market. Can either moon or crash spectacularly.",
    stats: {
      speed: 85,
      stamina: 60,
      consistency: 30,
      aggression: 90,
      luck: 75,
    },
  },
  {
    id: 4,
    name: "Robin",
    color: "#8e44ad",
    image: "/robin.png",
    bio: "The tank. Slow start but builds unstoppable momentum.",
    stats: {
      speed: 60,
      stamina: 95,
      consistency: 85,
      aggression: 50,
      luck: 45,
    },
  },
  {
    id: 5,
    name: "Tommy",
    color: "#3498db",
    image: "/tommy.png",
    bio: "Unpredictable but beloved. Runs on pure vibes and energy.",
    stats: {
      speed: 72,
      stamina: 65,
      consistency: 40,
      aggression: 70,
      luck: 95,
    },
  },
];

module.exports = { HORSES };
