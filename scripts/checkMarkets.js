const hre = require("hardhat");

async function main() {
  const contractAddress = "0xEB5CE903C786aC64c3Db673944fABB45f341b4Cb"; // a te címed
  const BettingMarket = await hre.ethers.getContractFactory("BettingMarket");
  const contract = await BettingMarket.attach(contractAddress);
  const count = await contract.marketCount();
  console.log("Piacok száma:", count.toString());
  if (count > 0) {
    for (let i = 1; i <= count; i++) {
      const market = await contract.markets(i);
      console.log(`${i}. kérdés: ${market.question} | Lejárat: ${new Date(Number(market.endTime) * 1000).toLocaleString()} | Lezárva: ${market.resolved}`);
    }
  }
}

main().catch(console.error);
