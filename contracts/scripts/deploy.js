const hre = require("hardhat");

async function main() {
  console.log("🐎 Deploying BetOnHorse contract...");

  const BetOnHorse = await hre.ethers.getContractFactory("BetOnHorse");
  const contract = await BetOnHorse.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`✅ BetOnHorse deployed to: ${address}`);
  console.log(`   Network: ${hre.network.name}`);
  console.log(`   Owner: ${(await hre.ethers.getSigners())[0].address}`);

  // Fund contract with some initial liquidity for payouts
  if (hre.network.name === "localhost") {
    const fundTx = await contract.fundContract({
      value: hre.ethers.parseEther("10"),
    });
    await fundTx.wait();
    console.log("   Funded with 10 ETH for payouts");
  }

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
