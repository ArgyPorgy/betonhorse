const crypto = require("crypto");
const { ethers } = require("ethers");
const { HORSES } = require("./horses");

/**
 * Race Engine - Determines race outcomes with house edge.
 *
 * The system:
 * 1. Each horse has base stats that influence win probability
 * 2. Random factors add unpredictability
 * 3. House edge is baked into probability distribution
 * 4. Result is determined BEFORE animation starts
 *
 * Seed hashing MUST use keccak256 to match the smart contract verification.
 */

class RaceEngine {
  /**
   * Generate a server seed for provably fair results (64 hex chars = 32 bytes)
   */
  static generateServerSeed() {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Hash the server seed for pre-commitment.
   * Uses keccak256 to match contract: keccak256(abi.encodePacked(_serverSeed))
   */
  static hashSeed(seed) {
    const seedBytes32 = seed.startsWith("0x") ? seed : "0x" + seed;
    return ethers.keccak256(seedBytes32);
  }

  /**
   * Calculate win probabilities for each horse with house edge baked in.
   *
   * The trick: horses with MORE bets get slightly LOWER win chances.
   * This ensures house wins over time without being obvious.
   *
   * @param {Object} betDistribution - { horseId: totalBetAmount }
   * @returns {number[]} probabilities for each horse (sum = 1)
   */
  static calculateProbabilities(betDistribution = {}) {
    const numHorses = HORSES.length;
    const baseProbabilities = [];

    // Step 1: Calculate base probability from horse stats
    let totalScore = 0;
    for (const horse of HORSES) {
      const s = horse.stats;
      const score =
        s.speed * 0.3 +
        s.stamina * 0.25 +
        s.consistency * 0.2 +
        s.aggression * 0.1 +
        s.luck * 0.15;
      baseProbabilities.push(score);
      totalScore += score;
    }

    // Normalize
    for (let i = 0; i < numHorses; i++) {
      baseProbabilities[i] /= totalScore;
    }

    // Step 2: Apply house edge - reduce probability of heavily bet horses
    const totalBets = Object.values(betDistribution).reduce(
      (a, b) => a + b,
      0
    );

    if (totalBets > 0) {
      const adjustedProbs = [...baseProbabilities];
      const houseEdgeFactor = 0.15; // 15% house edge influence

      for (let i = 0; i < numHorses; i++) {
        const horseBets = betDistribution[i] || 0;
        const betRatio = horseBets / totalBets;

        // Reduce probability proportional to how much is bet on this horse
        adjustedProbs[i] *= 1 - betRatio * houseEdgeFactor;
      }

      // Renormalize
      const adjTotal = adjustedProbs.reduce((a, b) => a + b, 0);
      for (let i = 0; i < numHorses; i++) {
        adjustedProbs[i] /= adjTotal;
      }

      return adjustedProbs;
    }

    return baseProbabilities;
  }

  /**
   * Determine the winner using the server seed and probabilities
   *
   * @param {string} serverSeed
   * @param {number} raceId
   * @param {Object} betDistribution
   * @returns {{ winner: number, probabilities: number[], seed: string }}
   */
  static determineWinner(serverSeed, raceId, betDistribution = {}) {
    const probabilities = this.calculateProbabilities(betDistribution);

    // Generate deterministic random from seed + raceId
    const hash = crypto
      .createHash("sha256")
      .update(serverSeed + raceId.toString())
      .digest("hex");

    // Convert first 8 hex chars to a number between 0 and 1
    const randomValue =
      parseInt(hash.substring(0, 8), 16) / 0xffffffff;

    // Pick winner based on cumulative probability
    let cumulative = 0;
    let winner = 0;
    for (let i = 0; i < probabilities.length; i++) {
      cumulative += probabilities[i];
      if (randomValue <= cumulative) {
        winner = i;
        break;
      }
    }

    return {
      winner,
      probabilities,
      seed: serverSeed,
      randomValue,
    };
  }

  /**
   * Generate movement keyframes for the race animation.
   * The winner is known beforehand; animation is cosmetic.
   *
   * @param {number} winner - winning horse index
   * @param {number} durationMs - race duration in ms
   * @returns {Object[]} per-horse animation data
   */
  static generateAnimationData(winner, durationMs = 30000) {
    const numFrames = 60; // 60 keyframes for smooth animation
    const frameInterval = durationMs / numFrames;
    const animations = [];

    for (let horseIdx = 0; horseIdx < HORSES.length; horseIdx++) {
      const horse = HORSES[horseIdx];
      const isWinner = horseIdx === winner;
      const keyframes = [];

      let position = 0;
      const baseSpeed =
        (horse.stats.speed / 100) * 0.8 + 0.2; // 0.2 - 1.0 range

      for (let frame = 0; frame <= numFrames; frame++) {
        const progress = frame / numFrames;

        // Base movement
        let speed = baseSpeed;

        // Add randomness/jitter
        const jitter =
          (Math.random() - 0.5) * 0.3 * (1 - horse.stats.consistency / 100);
        speed += jitter;

        // Stamina effect: fast horses tire, stamina horses hold
        const fatigue =
          progress > 0.6
            ? (1 - horse.stats.stamina / 100) * progress * 0.3
            : 0;
        speed -= fatigue;

        // Winner scripting: ensure winner finishes first
        if (isWinner) {
          // Late acceleration / comeback
          if (progress > 0.7) {
            speed += (progress - 0.7) * 2.5;
          }
          // Ensure minimum progress
          speed = Math.max(speed, 0.6);
        } else {
          // Non-winners slow down slightly at the end
          if (progress > 0.85) {
            speed *= 0.85;
          }
        }

        position += speed / numFrames;
        position = Math.min(position, isWinner ? 1.0 : 0.97);

        keyframes.push({
          frame,
          time: frame * frameInterval,
          position: Math.min(position, 1.0),
          speed,
        });
      }

      // Ensure winner hits exactly 1.0 at the end
      if (isWinner) {
        keyframes[keyframes.length - 1].position = 1.0;
      }

      // Ensure non-winners don't reach 1.0
      if (!isWinner) {
        const lastPos = keyframes[keyframes.length - 1].position;
        if (lastPos >= 0.97) {
          // Rescale to max 0.90-0.96
          const scale = (0.90 + Math.random() * 0.06) / lastPos;
          for (const kf of keyframes) {
            kf.position *= scale;
          }
        }
      }

      animations.push({
        horseId: horseIdx,
        name: horse.name,
        color: horse.color,
        keyframes,
      });
    }

    return animations;
  }
}

module.exports = { RaceEngine };
