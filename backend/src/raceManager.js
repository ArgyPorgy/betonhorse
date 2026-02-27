const { ethers } = require("ethers");
const { RaceEngine } = require("./raceEngine");
const { HORSES } = require("./horses");
const config = require("./config");

// ABI for the contract functions we need
const CONTRACT_ABI = [
  "function createRace(bytes32 _seedHash) external",
  "function lockRace(uint256 _raceId) external",
  "function settleRace(uint256 _raceId, uint8 _winningHorse, bytes32 _serverSeed) external",
  "function getRace(uint256 _raceId) external view returns (tuple(uint256 id, uint256 createdAt, uint256 lockedAt, uint256 settledAt, uint8 status, uint8 winningHorse, uint256 totalPool, bytes32 seedHash, bytes32 revealedSeed))",
  "function nextRaceId() external view returns (uint256)",
  "function getRaceHorsePool(uint256 _raceId, uint8 _horseId) external view returns (uint256)",
];

/**
 * Race Manager - Orchestrates the race lifecycle
 *
 * States: WAITING -> OPEN -> LOCKED -> RUNNING -> SETTLED -> WAITING
 *
 * IMPORTANT: Race only proceeds past OPEN if at least 1 bet was placed.
 * Otherwise the race is cancelled and a new one starts.
 */
class RaceManager {
  constructor(io, redis) {
    this.io = io;
    this.redis = redis;
    this.currentRace = null;
    this.raceTimer = null;
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.isContractReady = false;
    this.betCount = 0; // Track number of bets placed this race

    this._initContract();
  }

  _initContract() {
    try {
      if (config.CONTRACT_ADDRESS && config.OWNER_PRIVATE_KEY) {
        this.provider = new ethers.JsonRpcProvider(config.SEPOLIA_RPC_URL);
        this.wallet = new ethers.Wallet(
          config.OWNER_PRIVATE_KEY,
          this.provider
        );
        this.contract = new ethers.Contract(
          config.CONTRACT_ADDRESS,
          CONTRACT_ABI,
          this.wallet
        );
        this.isContractReady = true;
        console.log("[Contract] Connected:", config.CONTRACT_ADDRESS);
      } else {
        console.log(
          "[Contract] Missing ADDRESS or PRIVATE_KEY"
        );
      }
    } catch (err) {
      console.error("[Contract] Init failed:", err.message);
    }
  }

  /**
   * Start the automatic race loop
   */
  async startLoop() {
    console.log("[Race] Loop starting...");
    await this._runRaceCycle();
  }

  async _runRaceCycle() {
    try {
      // 1. Create new race
      await this._createRace();

      // 2. Wait for bets
      await this._waitForBets();

      // 3. Check if any bets were placed
      if (this.betCount === 0) {
        console.log(`[Race] #${this.currentRace.id} - No bets, skipping`);
        this.io.emit("race:skipped", {
          raceId: this.currentRace.id,
          message: "No bets placed. Starting a new race...",
        });
        // Short cooldown then restart
        await this._sleep(5000);
        this._runRaceCycle();
        return;
      }

      // 4. Lock bets
      await this._lockRace();

      // 5. Determine winner & run animation
      await this._runRace();

      // 6. Settle on-chain
      await this._settleRace();

      // 7. Cooldown before next race
      await this._cooldown();
    } catch (err) {
      console.error("[Race] Cycle error:", err.message);
      this.io.emit("race:error", {
        message: "Race encountered an error. Next race starting soon...",
      });
      await this._sleep(10000);
    }

    // Loop
    this._runRaceCycle();
  }

  async _createRace() {
    const serverSeed = RaceEngine.generateServerSeed();
    const seedHash = RaceEngine.hashSeed(serverSeed);
    this.betCount = 0;

    // Get race ID
    let raceId;
    if (this.isContractReady) {
      try {
        const tx = await this.contract.createRace(seedHash);
        await tx.wait();
        raceId = Number(await this.contract.nextRaceId()) - 1;
        console.log(`[Race] #${raceId} created on-chain`);
      } catch (err) {
        console.error("Contract createRace failed:", err.message);
        raceId = Date.now();
      }
    } else {
      raceId = Date.now();
    }

    this.currentRace = {
      id: raceId,
      status: "OPEN",
      serverSeed,
      seedHash,
      horses: HORSES.map((h) => ({
        id: h.id,
        name: h.name,
        color: h.color,
        image: h.image,
        bio: h.bio,
      })),
      bets: {},
      totalPool: 0,
      startTime: Date.now(),
      betDeadline: Date.now() + config.BET_WINDOW_MS,
      winner: null,
      animation: null,
    };

    // Save to Redis
    try {
      await this.redis.set(
        `race:${raceId}`,
        JSON.stringify(this.currentRace)
      );
      await this.redis.set("race:current", raceId.toString());
    } catch {
      // Redis unavailable
    }

    // Broadcast
    this.io.emit("race:created", {
      id: raceId,
      status: "OPEN",
      horses: this.currentRace.horses,
      betDeadline: this.currentRace.betDeadline,
      seedHash,
    });

    console.log(`[Race] #${raceId} OPEN - Betting for ${config.BET_WINDOW_MS / 1000}s`);
  }

  async _waitForBets() {
    const waitTime = config.BET_WINDOW_MS;

    // Countdown broadcasts
    const countdownInterval = setInterval(() => {
      const remaining = Math.max(
        0,
        this.currentRace.betDeadline - Date.now()
      );
      this.io.emit("race:countdown", {
        raceId: this.currentRace.id,
        remaining,
        totalPool: this.currentRace.totalPool,
        betCount: this.betCount,
      });
    }, 1000);

    await this._sleep(waitTime);
    clearInterval(countdownInterval);
  }

  async _lockRace() {
    this.currentRace.status = "LOCKED";

    if (this.isContractReady) {
      try {
        const tx = await this.contract.lockRace(this.currentRace.id);
        await tx.wait();
        console.log(`[Race] #${this.currentRace.id} locked on-chain`);
      } catch (err) {
        console.error("Contract lockRace failed:", err.message);
      }
    }

    this.io.emit("race:locked", {
      raceId: this.currentRace.id,
    });

    console.log(`Race #${this.currentRace.id} LOCKED`);
    // Minimal delay before race starts
    await this._sleep(1000);
  }

  async _runRace() {
    this.currentRace.status = "RUNNING";

    // Gather bet distribution
    const betDistribution = {};
    for (let i = 0; i < config.NUM_HORSES; i++) {
      if (this.isContractReady) {
        try {
          const pool = await this.contract.getRaceHorsePool(
            this.currentRace.id,
            i
          );
          betDistribution[i] = Number(pool);
        } catch {
          betDistribution[i] = 0;
        }
      } else {
        betDistribution[i] = this.currentRace.bets[i] || 0;
      }
    }

    // Determine winner
    const result = RaceEngine.determineWinner(
      this.currentRace.serverSeed,
      this.currentRace.id,
      betDistribution
    );

    this.currentRace.winner = result.winner;
    this.currentRace.probabilities = result.probabilities;

    // Generate animation data
    const animation = RaceEngine.generateAnimationData(
      result.winner,
      config.RACE_DURATION_MS
    );
    this.currentRace.animation = animation;

    // Winner determined (not logged to prevent spoilers)

    // Broadcast race start with animation data
    this.io.emit("race:started", {
      raceId: this.currentRace.id,
      animation,
      duration: config.RACE_DURATION_MS,
    });

    // Wait for animation to complete on clients
    await this._sleep(config.RACE_DURATION_MS + 2000);

    // Reveal result
    this.io.emit("race:result", {
      raceId: this.currentRace.id,
      winner: result.winner,
      winnerName: HORSES[result.winner].name,
      winnerColor: HORSES[result.winner].color,
      probabilities: result.probabilities,
      seed: this.currentRace.serverSeed,
      seedHash: this.currentRace.seedHash,
    });
  }

  async _settleRace() {
    this.currentRace.status = "SETTLED";

    if (this.isContractReady) {
      try {
        // Seed is 64 hex chars = 32 bytes, pass as bytes32 for contract verification
        const serverSeedBytes32 =
          this.currentRace.serverSeed.startsWith("0x")
            ? this.currentRace.serverSeed
            : "0x" + this.currentRace.serverSeed;

        const tx = await this.contract.settleRace(
          this.currentRace.id,
          this.currentRace.winner,
          serverSeedBytes32
        );
        await tx.wait();
        console.log(`[Race] #${this.currentRace.id} settled on-chain`);
      } catch (err) {
        console.error("Contract settleRace failed:", err.message);
      }
    }

    // Save final state
    try {
      await this.redis.set(
        `race:${this.currentRace.id}`,
        JSON.stringify(this.currentRace)
      );
      await this.redis.lpush(
        "race:history",
        JSON.stringify({
          id: this.currentRace.id,
          winner: this.currentRace.winner,
          winnerName: HORSES[this.currentRace.winner].name,
          totalPool: this.currentRace.totalPool,
          settledAt: Date.now(),
        })
      );
      await this.redis.ltrim("race:history", 0, 49);
    } catch {
      // Redis unavailable
    }

    this.io.emit("race:settled", {
      raceId: this.currentRace.id,
    });

    console.log(`[Race] #${this.currentRace.id} SETTLED`);
  }

  async _cooldown() {
    const cooldownTime = 15000;
    this.io.emit("race:cooldown", {
      nextRaceIn: cooldownTime,
    });
    console.log(`[Race] Next in ${cooldownTime / 1000}s`);
    await this._sleep(cooldownTime);
  }

  /**
   * Handle a bet from a player (tracks locally for race logic)
   */
  placeBet(playerAddress, horseId, amount) {
    if (!this.currentRace || this.currentRace.status !== "OPEN") {
      return { success: false, error: "Race not open for bets" };
    }

    if (horseId < 0 || horseId >= config.NUM_HORSES) {
      return { success: false, error: "Invalid horse" };
    }

    this.currentRace.bets[horseId] =
      (this.currentRace.bets[horseId] || 0) + amount;
    this.currentRace.totalPool += amount;
    this.betCount++;

    console.log(`[Bet] ${playerAddress.slice(0, 8)}... on Horse #${horseId} (${amount} ETH)`);

    return { success: true, raceId: this.currentRace.id };
  }

  /**
   * Get current race state for new connections
   */
  getCurrentState() {
    if (!this.currentRace) {
      return { status: "WAITING", message: "No race active" };
    }

    return {
      id: this.currentRace.id,
      status: this.currentRace.status,
      horses: this.currentRace.horses,
      betDeadline: this.currentRace.betDeadline,
      seedHash: this.currentRace.seedHash,
      totalPool: this.currentRace.totalPool,
      winner:
        this.currentRace.status === "SETTLED"
          ? this.currentRace.winner
          : null,
    };
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = { RaceManager };
