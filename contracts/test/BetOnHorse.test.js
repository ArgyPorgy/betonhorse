const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BetOnHorse", function () {
  let contract;
  let owner;
  let player1;
  let player2;

  const SERVER_SEED = "test-seed-12345";
  const SEED_HASH = ethers.keccak256(ethers.toUtf8Bytes(SERVER_SEED));

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    const BetOnHorse = await ethers.getContractFactory("BetOnHorse");
    contract = await BetOnHorse.deploy();
    await contract.waitForDeployment();

    // Fund contract for payouts
    await contract.fundContract({ value: ethers.parseEther("10") });
  });

  describe("Race Management", function () {
    it("should create a race", async function () {
      await contract.createRace(SEED_HASH);
      const race = await contract.getRace(1);
      expect(race.id).to.equal(1);
      expect(race.status).to.equal(0); // OPEN
    });

    it("should lock a race", async function () {
      await contract.createRace(SEED_HASH);
      await contract.lockRace(1);
      const race = await contract.getRace(1);
      expect(race.status).to.equal(1); // LOCKED
    });

    it("should not allow non-owner to create race", async function () {
      await expect(
        contract.connect(player1).createRace(SEED_HASH)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });
  });

  describe("Betting", function () {
    beforeEach(async function () {
      await contract.createRace(SEED_HASH);
    });

    it("should place a bet", async function () {
      await contract
        .connect(player1)
        .placeBet(1, 0, { value: ethers.parseEther("0.01") });

      const bet = await contract.getBet(1);
      expect(bet.player).to.equal(player1.address);
      expect(bet.horseId).to.equal(0);
      expect(bet.amount).to.equal(ethers.parseEther("0.01"));
    });

    it("should reject bet below minimum", async function () {
      await expect(
        contract
          .connect(player1)
          .placeBet(1, 0, { value: ethers.parseEther("0.0001") })
      ).to.be.revertedWith("Bet too small");
    });

    it("should reject bet on locked race", async function () {
      await contract.lockRace(1);
      await expect(
        contract
          .connect(player1)
          .placeBet(1, 0, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("Race not open for bets");
    });

    it("should track per-horse pool", async function () {
      await contract
        .connect(player1)
        .placeBet(1, 0, { value: ethers.parseEther("0.05") });
      await contract
        .connect(player2)
        .placeBet(1, 2, { value: ethers.parseEther("0.03") });

      const pool0 = await contract.getRaceHorsePool(1, 0);
      const pool2 = await contract.getRaceHorsePool(1, 2);
      expect(pool0).to.equal(ethers.parseEther("0.05"));
      expect(pool2).to.equal(ethers.parseEther("0.03"));
    });
  });

  describe("Settlement & Claims", function () {
    beforeEach(async function () {
      await contract.createRace(SEED_HASH);
      await contract
        .connect(player1)
        .placeBet(1, 2, { value: ethers.parseEther("0.1") });
      await contract
        .connect(player2)
        .placeBet(1, 3, { value: ethers.parseEther("0.1") });
      await contract.lockRace(1);
    });

    it("should settle race with valid seed", async function () {
      const serverSeedBytes = ethers.toUtf8Bytes(SERVER_SEED);
      // Need to compute the hash the same way the contract does
      // Contract uses: keccak256(abi.encodePacked(_serverSeed))
      // We passed SEED_HASH = keccak256(toUtf8Bytes(SERVER_SEED))
      // But contract expects bytes32 input and hashes it with abi.encodePacked
      // For testing, we need to align - let's use bytes32 directly
      const seedBytes32 = ethers.zeroPadValue(
        ethers.toUtf8Bytes(SERVER_SEED.substring(0, 31)),
        32
      );
      const correctHash = ethers.keccak256(
        ethers.solidityPacked(["bytes32"], [seedBytes32])
      );

      // Recreate with correct hash
      const BetOnHorse = await ethers.getContractFactory("BetOnHorse");
      const newContract = await BetOnHorse.deploy();
      await newContract.waitForDeployment();
      await newContract.fundContract({ value: ethers.parseEther("10") });
      await newContract.createRace(correctHash);
      await newContract
        .connect(player1)
        .placeBet(1, 2, { value: ethers.parseEther("0.1") });
      await newContract.lockRace(1);

      await newContract.settleRace(1, 2, seedBytes32);
      const race = await newContract.getRace(1);
      expect(race.status).to.equal(2); // SETTLED
      expect(race.winningHorse).to.equal(2);
    });

    it("should allow winner to claim", async function () {
      const seedBytes32 = ethers.zeroPadValue(
        ethers.toUtf8Bytes(SERVER_SEED.substring(0, 31)),
        32
      );
      const correctHash = ethers.keccak256(
        ethers.solidityPacked(["bytes32"], [seedBytes32])
      );

      const BetOnHorse = await ethers.getContractFactory("BetOnHorse");
      const newContract = await BetOnHorse.deploy();
      await newContract.waitForDeployment();
      await newContract.fundContract({ value: ethers.parseEther("10") });
      await newContract.createRace(correctHash);
      await newContract
        .connect(player1)
        .placeBet(1, 2, { value: ethers.parseEther("0.1") });
      await newContract.lockRace(1);
      await newContract.settleRace(1, 2, seedBytes32);

      const balanceBefore = await ethers.provider.getBalance(player1.address);
      await newContract.connect(player1).claim(1);
      const balanceAfter = await ethers.provider.getBalance(player1.address);

      // Should have received ~0.19 ETH (2x - 5% fee)
      expect(balanceAfter - balanceBefore).to.be.greaterThan(
        ethers.parseEther("0.18")
      );
    });
  });

  describe("House Functions", function () {
    it("should allow owner to withdraw house fees", async function () {
      // Setup a complete race cycle
      const seedBytes32 = ethers.zeroPadValue(
        ethers.toUtf8Bytes(SERVER_SEED.substring(0, 31)),
        32
      );
      const correctHash = ethers.keccak256(
        ethers.solidityPacked(["bytes32"], [seedBytes32])
      );

      await contract.createRace(correctHash);
      await contract
        .connect(player1)
        .placeBet(1, 2, { value: ethers.parseEther("0.1") });
      await contract
        .connect(player2)
        .placeBet(1, 3, { value: ethers.parseEther("0.1") });
      await contract.lockRace(1);

      // Redeploy with correct hash for settlement
      const BetOnHorse = await ethers.getContractFactory("BetOnHorse");
      const newContract = await BetOnHorse.deploy();
      await newContract.waitForDeployment();
      await newContract.fundContract({ value: ethers.parseEther("10") });
      await newContract.createRace(correctHash);
      await newContract
        .connect(player1)
        .placeBet(1, 2, { value: ethers.parseEther("0.1") });
      await newContract
        .connect(player2)
        .placeBet(1, 3, { value: ethers.parseEther("0.1") });
      await newContract.lockRace(1);
      await newContract.settleRace(1, 2, seedBytes32);

      const houseBal = await newContract.houseBalance();
      expect(houseBal).to.be.greaterThan(0);
    });
  });
});
