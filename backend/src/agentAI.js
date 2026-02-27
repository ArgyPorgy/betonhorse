/**
 * AI Agent Module - Gives each horse a unique personality using Groq API
 *
 * Each horse is an "AI agent" with:
 * - Unique personality traits
 * - Pre-race commentary
 * - Post-race reactions
 * - AI-generated dynamic stats analysis
 *
 * The AI doesn't affect race outcomes (those are deterministic),
 * but adds flavor and the "agentic" feel.
 */

const Groq = require("groq-sdk");
const { HORSES } = require("./horses");

// Initialize Groq client (optional - works without API key)
let groq = null;
try {
  if (process.env.GROQ_API_KEY) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    console.log("[AI] Groq connected");
  } else {
    console.log("[AI] No GROQ_API_KEY - using static content");
  }
} catch (err) {
  console.log("[AI] Init failed - using static content");
}

// Pre-defined personality traits for each horse
const PERSONALITIES = {
  0: {
    // Alexa
    trait: "Confident and fierce",
    style: "Bold and competitive",
    catchphrase: "Speed is my middle name.",
  },
  1: {
    // Dan
    trait: "Mysterious and calculating",
    style: "Cryptic and philosophical",
    catchphrase: "The shadows reveal all.",
  },
  2: {
    // Peter
    trait: "Charismatic crowd-pleaser",
    style: "Friendly and encouraging",
    catchphrase: "Let's give them a show.",
  },
  3: {
    // Robert
    trait: "Volatile and unpredictable",
    style: "Erratic and bold",
    catchphrase: "Expect the unexpected.",
  },
  4: {
    // Robin
    trait: "Stoic and determined",
    style: "Calm and wise",
    catchphrase: "Slow and steady wins the race.",
  },
  5: {
    // Tommy
    trait: "Playful and lucky",
    style: "Energetic and random",
    catchphrase: "Feeling lucky today.",
  },
};

// Pre-defined pre-race taunts
const PRE_RACE_TAUNTS = {
  0: [
    "You're all just running for second place.",
    "My speed is unmatched. Watch and learn.",
    "Alexa's about to break some records today.",
  ],
  1: [
    "The darkness favors the patient.",
    "You won't see me coming until it's too late.",
    "Dan moves in silence. Results speak louder.",
  ],
  2: [
    "May the best horse win. That's me by the way.",
    "The crowd's energy fuels my victory.",
    "Peter's here to put on a championship show.",
  ],
  3: [
    "This race is going to be wild.",
    "Diamond hooves, baby. Not giving up this W.",
    "Robert's volatility is a feature not a bug.",
  ],
  4: [
    "Patience is a virtue. Victory is inevitable.",
    "While they sprint, I strategize.",
    "Robin doesn't rush. Robin dominates.",
  ],
  5: [
    "Fortune favors the bold.",
    "Vibes are immaculate. Victory incoming.",
    "Tommy's got that main character energy.",
  ],
};

// Pre-defined win/lose reactions
const WIN_REACTIONS = {
  0: "Blazing fast. Nobody can touch Alexa.",
  1: "From the shadows to the spotlight.",
  2: "The crowd goes wild. Peter delivers again.",
  3: "What did I tell you? Robert pumped.",
  4: "Patience. Precision. Victory.",
  5: "Luck is a skill. Tommy takes it home.",
};

const LOSE_REACTIONS = {
  0: "Just warming up. Next race is mine.",
  1: "The shadows will have their revenge.",
  2: "GG. The real winner is the friends we made.",
  3: "Just a dip before the pump.",
  4: "A minor setback. The mountain remains.",
  5: "Fortune wasn't on my side. Rematch.",
};

class AgentAI {
  /**
   * Get pre-race commentary from all horses
   */
  static async getPreRaceCommentary(raceId) {
    const commentary = [];

    for (const horse of HORSES) {
      const personality = PERSONALITIES[horse.id];
      const taunts = PRE_RACE_TAUNTS[horse.id];

      // Use Groq if available for dynamic commentary
      if (groq && Math.random() > 0.5) {
        try {
          const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "system",
                content: `You are ${horse.name}, an AI horse racing agent. Your personality: ${personality.trait}. Your style: ${personality.style}. Generate a SHORT (max 15 words) pre-race taunt or hype message. Be in character. No emojis.`,
              },
              {
                role: "user",
                content: `Race #${raceId} is about to start. Give your pre-race message.`,
              },
            ],
            max_tokens: 50,
            temperature: 0.9,
          });

          commentary.push({
            horseId: horse.id,
            horseName: horse.name,
            message:
              response.choices[0]?.message?.content || taunts[0],
            isAI: true,
          });
        } catch {
          // Fallback to pre-defined
          commentary.push({
            horseId: horse.id,
            horseName: horse.name,
            message: taunts[Math.floor(Math.random() * taunts.length)],
            isAI: false,
          });
        }
      } else {
        // Use pre-defined taunts
        commentary.push({
          horseId: horse.id,
          horseName: horse.name,
          message: taunts[Math.floor(Math.random() * taunts.length)],
          isAI: false,
        });
      }
    }

    return commentary;
  }

  /**
   * Get post-race reaction from winner and losers
   */
  static async getPostRaceReactions(winnerId) {
    const reactions = [];

    for (const horse of HORSES) {
      const isWinner = horse.id === winnerId;

      if (groq && Math.random() > 0.7) {
        try {
          const personality = PERSONALITIES[horse.id];
          const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "system",
                content: `You are ${horse.name}, an AI horse racing agent. Your personality: ${personality.trait}. Your style: ${personality.style}. Generate a SHORT (max 12 words) ${isWinner ? "victory celebration" : "graceful loss reaction"}. Be in character. No emojis.`,
              },
              {
                role: "user",
                content: isWinner
                  ? "You just WON the race! Celebrate!"
                  : "You lost the race. React gracefully.",
              },
            ],
            max_tokens: 40,
            temperature: 0.9,
          });

          reactions.push({
            horseId: horse.id,
            horseName: horse.name,
            message: response.choices[0]?.message?.content,
            isWinner,
            isAI: true,
          });
        } catch {
          reactions.push({
            horseId: horse.id,
            horseName: horse.name,
            message: isWinner
              ? WIN_REACTIONS[horse.id]
              : LOSE_REACTIONS[horse.id],
            isWinner,
            isAI: false,
          });
        }
      } else {
        reactions.push({
          horseId: horse.id,
          horseName: horse.name,
          message: isWinner
            ? WIN_REACTIONS[horse.id]
            : LOSE_REACTIONS[horse.id],
          isWinner,
          isAI: false,
        });
      }
    }

    return reactions;
  }

  /**
   * Get AI-generated stats analysis for a horse
   */
  static async getStatsAnalysis(horseId) {
    const horse = HORSES.find((h) => h.id === horseId);
    if (!horse) return null;

    const personality = PERSONALITIES[horseId];

    // Default static analysis
    const staticAnalysis = {
      horseId,
      horseName: horse.name,
      summary: `${horse.name} is known for ${personality.trait.toLowerCase()} racing style.`,
      strengths: getStaticStrengths(horse),
      weaknesses: getStaticWeaknesses(horse),
      recommendation: getStaticRecommendation(horse),
      isAI: false,
    };

    if (!groq) return staticAnalysis;

    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a horse racing analyst AI. Analyze the following horse's stats and provide betting insights. Be concise and professional. No emojis.

Horse: ${horse.name}
Stats:
- Speed: ${horse.stats.speed}/100
- Stamina: ${horse.stats.stamina}/100
- Consistency: ${horse.stats.consistency}/100
- Aggression: ${horse.stats.aggression}/100
- Luck Factor: ${horse.stats.luck}/100

Personality: ${personality.trait}`,
          },
          {
            role: "user",
            content:
              "Provide a brief analysis (max 50 words) of this horse's racing potential, including key strengths and when to bet on them.",
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      });

      return {
        horseId,
        horseName: horse.name,
        analysis: response.choices[0]?.message?.content || staticAnalysis.summary,
        stats: horse.stats,
        personality: personality.trait,
        isAI: true,
      };
    } catch {
      return staticAnalysis;
    }
  }

  /**
   * Get AI-generated race prediction
   */
  static async getRacePrediction(raceId) {
    if (!groq) {
      return {
        raceId,
        prediction: "All horses have competitive chances. May the best horse win.",
        confidence: "Medium",
        isAI: false,
      };
    }

    try {
      const horseStats = HORSES.map(
        (h) =>
          `${h.name}: Speed ${h.stats.speed}, Stamina ${h.stats.stamina}, Consistency ${h.stats.consistency}`
      ).join("\n");

      const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a horse racing prediction AI. Based on stats, provide a brief race prediction. Be analytical and professional. No emojis. Max 40 words.

Horses in Race #${raceId}:
${horseStats}`,
          },
          {
            role: "user",
            content: "Who has the best chance to win and why?",
          },
        ],
        max_tokens: 80,
        temperature: 0.8,
      });

      return {
        raceId,
        prediction: response.choices[0]?.message?.content,
        isAI: true,
      };
    } catch {
      return {
        raceId,
        prediction: "All horses have competitive chances. May the best horse win.",
        isAI: false,
      };
    }
  }

  /**
   * Get horse personality info
   */
  static getPersonality(horseId) {
    return PERSONALITIES[horseId] || PERSONALITIES[0];
  }

  /**
   * Check if Groq AI is available
   */
  static isAIEnabled() {
    return !!groq;
  }
}

// Helper functions for static analysis
function getStaticStrengths(horse) {
  const strengths = [];
  if (horse.stats.speed >= 80) strengths.push("Exceptional speed");
  if (horse.stats.stamina >= 80) strengths.push("High endurance");
  if (horse.stats.consistency >= 80) strengths.push("Very reliable");
  if (horse.stats.luck >= 80) strengths.push("Lucky breaks");
  if (strengths.length === 0) strengths.push("Balanced performer");
  return strengths;
}

function getStaticWeaknesses(horse) {
  const weaknesses = [];
  if (horse.stats.speed < 60) weaknesses.push("Slower pace");
  if (horse.stats.stamina < 60) weaknesses.push("Tires quickly");
  if (horse.stats.consistency < 60) weaknesses.push("Unpredictable");
  if (weaknesses.length === 0) weaknesses.push("No major weaknesses");
  return weaknesses;
}

function getStaticRecommendation(horse) {
  const avgStat =
    (horse.stats.speed +
      horse.stats.stamina +
      horse.stats.consistency +
      horse.stats.luck) /
    4;
  if (avgStat >= 75) return "Strong contender - good for consistent betting";
  if (avgStat >= 60) return "Solid choice - moderate risk";
  return "High risk, high reward - bet cautiously";
}

module.exports = { AgentAI };
