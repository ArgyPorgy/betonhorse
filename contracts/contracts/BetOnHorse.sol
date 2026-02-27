// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BetOnHorse
 * @notice Trustless horse racing betting contract on Sepolia
 * @dev Escrow-based betting with house edge. Funds stay in contract until settlement.
 */
contract BetOnHorse is ReentrancyGuard, Ownable {
    // ──────────────────────────────────────────────
    // Constants
    // ──────────────────────────────────────────────
    uint8 public constant NUM_HORSES = 6;
    uint256 public constant MIN_BET = 0.001 ether;
    uint256 public constant MAX_BET = 1 ether;
    uint16 public constant PAYOUT_MULTIPLIER = 200; // 2x payout (basis points / 100)
    uint16 public constant HOUSE_FEE_BPS = 500; // 5% house fee on winnings
    uint256 public constant BET_WINDOW = 2 minutes;

    // ──────────────────────────────────────────────
    // Data Structures
    // ──────────────────────────────────────────────
    enum RaceStatus {
        OPEN,        // Accepting bets
        LOCKED,      // No more bets, race starting
        SETTLED      // Result determined, payouts available
    }

    struct Race {
        uint256 id;
        uint256 createdAt;
        uint256 lockedAt;
        uint256 settledAt;
        RaceStatus status;
        uint8 winningHorse;    // 0-5
        uint256 totalPool;
        bytes32 seedHash;      // Pre-committed seed hash for fairness
        bytes32 revealedSeed;  // Revealed after settlement
    }

    struct Bet {
        address player;
        uint256 raceId;
        uint8 horseId;         // 0-5
        uint256 amount;
        bool claimed;
    }

    // ──────────────────────────────────────────────
    // State
    // ──────────────────────────────────────────────
    uint256 public nextRaceId;
    uint256 public nextBetId;
    uint256 public houseBalance;

    mapping(uint256 => Race) public races;
    mapping(uint256 => Bet) public bets;
    mapping(uint256 => uint256[]) public raceBetIds; // raceId => betId[]
    mapping(address => uint256[]) public playerBetIds; // player => betId[]

    // Track per-horse pool for each race
    mapping(uint256 => mapping(uint8 => uint256)) public raceHorsePool;

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────
    event RaceCreated(uint256 indexed raceId, bytes32 seedHash, uint256 createdAt);
    event RaceLocked(uint256 indexed raceId, uint256 lockedAt);
    event RaceSettled(uint256 indexed raceId, uint8 winningHorse, bytes32 revealedSeed);
    event BetPlaced(uint256 indexed betId, uint256 indexed raceId, address indexed player, uint8 horseId, uint256 amount);
    event WinningsClaimed(uint256 indexed betId, address indexed player, uint256 payout);
    event HouseWithdrawal(address indexed to, uint256 amount);

    // ──────────────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────────────
    constructor() Ownable(msg.sender) {
        nextRaceId = 1;
        nextBetId = 1;
    }

    // ──────────────────────────────────────────────
    // Race Management (Owner)
    // ──────────────────────────────────────────────

    /**
     * @notice Create a new race with a pre-committed seed hash
     * @param _seedHash keccak256(serverSeed) for provable fairness
     */
    function createRace(bytes32 _seedHash) external onlyOwner {
        uint256 raceId = nextRaceId++;

        races[raceId] = Race({
            id: raceId,
            createdAt: block.timestamp,
            lockedAt: 0,
            settledAt: 0,
            status: RaceStatus.OPEN,
            winningHorse: 0,
            totalPool: 0,
            seedHash: _seedHash,
            revealedSeed: bytes32(0)
        });

        emit RaceCreated(raceId, _seedHash, block.timestamp);
    }

    /**
     * @notice Lock the race - no more bets accepted
     */
    function lockRace(uint256 _raceId) external onlyOwner {
        Race storage race = races[_raceId];
        require(race.id != 0, "Race does not exist");
        require(race.status == RaceStatus.OPEN, "Race not open");

        race.status = RaceStatus.LOCKED;
        race.lockedAt = block.timestamp;

        emit RaceLocked(_raceId, block.timestamp);
    }

    /**
     * @notice Settle the race with the winning horse
     * @param _raceId The race to settle
     * @param _winningHorse The winning horse index (0-5)
     * @param _serverSeed The revealed server seed for verification
     */
    function settleRace(
        uint256 _raceId,
        uint8 _winningHorse,
        bytes32 _serverSeed
    ) external onlyOwner {
        Race storage race = races[_raceId];
        require(race.id != 0, "Race does not exist");
        require(race.status == RaceStatus.LOCKED, "Race not locked");
        require(_winningHorse < NUM_HORSES, "Invalid horse");

        // Verify the seed matches the pre-committed hash
        require(
            keccak256(abi.encodePacked(_serverSeed)) == race.seedHash,
            "Seed verification failed"
        );

        race.status = RaceStatus.SETTLED;
        race.winningHorse = _winningHorse;
        race.settledAt = block.timestamp;
        race.revealedSeed = _serverSeed;

        // Calculate house take from losing bets
        uint256 losingPool = race.totalPool - raceHorsePool[_raceId][_winningHorse];
        uint256 houseCut = (losingPool * HOUSE_FEE_BPS) / 10000;
        houseBalance += houseCut;

        emit RaceSettled(_raceId, _winningHorse, _serverSeed);
    }

    // ──────────────────────────────────────────────
    // Betting (Players)
    // ──────────────────────────────────────────────

    /**
     * @notice Place a bet on a horse for a specific race
     * @param _raceId The race to bet on
     * @param _horseId The horse to bet on (0-5)
     */
    function placeBet(uint256 _raceId, uint8 _horseId) external payable nonReentrant {
        require(msg.value >= MIN_BET, "Bet too small");
        require(msg.value <= MAX_BET, "Bet too large");
        require(_horseId < NUM_HORSES, "Invalid horse");

        Race storage race = races[_raceId];
        require(race.id != 0, "Race does not exist");
        require(race.status == RaceStatus.OPEN, "Race not open for bets");

        uint256 betId = nextBetId++;

        bets[betId] = Bet({
            player: msg.sender,
            raceId: _raceId,
            horseId: _horseId,
            amount: msg.value,
            claimed: false
        });

        raceBetIds[_raceId].push(betId);
        playerBetIds[msg.sender].push(betId);
        race.totalPool += msg.value;
        raceHorsePool[_raceId][_horseId] += msg.value;

        emit BetPlaced(betId, _raceId, msg.sender, _horseId, msg.value);
    }

    /**
     * @notice Claim winnings for a winning bet
     * @param _betId The bet to claim
     */
    function claim(uint256 _betId) external nonReentrant {
        Bet storage bet = bets[_betId];
        require(bet.player == msg.sender, "Not your bet");
        require(!bet.claimed, "Already claimed");

        Race storage race = races[bet.raceId];
        require(race.status == RaceStatus.SETTLED, "Race not settled");
        require(bet.horseId == race.winningHorse, "Bet did not win");

        bet.claimed = true;

        // 2x payout minus house fee
        uint256 grossPayout = (bet.amount * PAYOUT_MULTIPLIER) / 100;
        uint256 fee = (grossPayout * HOUSE_FEE_BPS) / 10000;
        uint256 netPayout = grossPayout - fee;
        houseBalance += fee;

        require(address(this).balance >= netPayout, "Insufficient contract balance");

        (bool success, ) = payable(msg.sender).call{value: netPayout}("");
        require(success, "Transfer failed");

        emit WinningsClaimed(_betId, msg.sender, netPayout);
    }

    // ──────────────────────────────────────────────
    // House Functions (Owner)
    // ──────────────────────────────────────────────

    /**
     * @notice Withdraw accumulated house fees
     */
    function withdrawHouseFees(uint256 _amount) external onlyOwner nonReentrant {
        require(_amount <= houseBalance, "Exceeds house balance");
        houseBalance -= _amount;

        (bool success, ) = payable(owner()).call{value: _amount}("");
        require(success, "Transfer failed");

        emit HouseWithdrawal(owner(), _amount);
    }

    /**
     * @notice Fund the contract (for initial liquidity / payouts)
     */
    function fundContract() external payable onlyOwner {
        // Just receive ETH for payout liquidity
    }

    // ──────────────────────────────────────────────
    // View Functions
    // ──────────────────────────────────────────────

    function getRace(uint256 _raceId) external view returns (Race memory) {
        return races[_raceId];
    }

    function getBet(uint256 _betId) external view returns (Bet memory) {
        return bets[_betId];
    }

    function getRaceBets(uint256 _raceId) external view returns (uint256[] memory) {
        return raceBetIds[_raceId];
    }

    function getPlayerBets(address _player) external view returns (uint256[] memory) {
        return playerBetIds[_player];
    }

    function getRaceHorsePool(uint256 _raceId, uint8 _horseId) external view returns (uint256) {
        return raceHorsePool[_raceId][_horseId];
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Get current race status and info for the latest race
     */
    function getCurrentRace() external view returns (Race memory) {
        require(nextRaceId > 1, "No races created");
        return races[nextRaceId - 1];
    }

    // Allow contract to receive ETH
    receive() external payable {}
}
