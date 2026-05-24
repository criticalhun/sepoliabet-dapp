const hre = require("hardhat");

async function main() {
  const BettingMarket = await hre.ethers.getContractFactory("BettingMarket");
  const contract = await BettingMarket.deploy();
  await contract.waitForDeployment();
  console.log("Szerződés címe:", await contract.getAddress());
}

main().catch(console.error);
