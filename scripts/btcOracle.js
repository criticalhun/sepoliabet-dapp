const hre = require("hardhat");
const axios = require("axios");

const CONTRACT_ADDRESS = "0xEB5CE903C786aC64c3Db673944fABB45f341b4Cb";
const INTERVALS_MINUTES = [10, 15, 30, 45, 60];
const CREATION_INTERVAL_MS = 5 * 60 * 1000;      // 5 percenként újraindítja az összes időtávot
const RESOLUTION_CHECK_MS = 30 * 1000;            // fél percenként ellenőrzi a lejártakat

let activeMarkets = [];   // { marketId, startPrice, endTime, interval }

async function fetchBTCPrice() {
  try {
    const response = await axios.get(
      "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest",
      {
        params: { symbol: "BTC", convert: "USD" },
        headers: { "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY },
      }
    );
    const price = response.data.data.BTC[0].quote.USD.price;
    console.log(`Aktuális BTC ár: ${price} USD`);
    return price;
  } catch (error) {
    console.error("API hiba:", error.message);
    return null;
  }
}

async function createMarket(contract, startPrice, intervalMinutes) {
  const now = Math.floor(Date.now() / 1000);
  const endTime = now + intervalMinutes * 60;
  const question = `BTC árfolyam: ${startPrice.toFixed(2)} USD | Magasabb? | Lejárat: ${new Date(endTime * 1000).toLocaleString()}`;
  
  const tx = await contract.createMarket(question, endTime);
  await tx.wait();
  
  const marketCount = await contract.marketCount();
  const marketId = Number(marketCount);
  activeMarkets.push({ marketId, startPrice, endTime, interval: intervalMinutes });
  console.log(`Piac létrehozva #${marketId} (${intervalMinutes} perc): ${question}`);
}

async function resolveMarket(contract, market) {
  const currentPrice = await fetchBTCPrice();
  if (currentPrice === null) {
    console.error(`Nem sikerült lekérni az árat a(z) #${market.marketId} feloldásához.`);
    return;
  }
  const outcome = currentPrice > market.startPrice;   // true = FEL, false = LE
  try {
    const tx = await contract.resolveMarket(market.marketId, outcome);
    await tx.wait();
    console.log(`Piac #${market.marketId} feloldva: ${outcome ? "FEL" : "LE"} (kezdő: ${market.startPrice}, jelenlegi: ${currentPrice})`);
    activeMarkets = activeMarkets.filter(m => m.marketId !== market.marketId);
  } catch (error) {
    console.error(`Feloldási hiba #${market.marketId}:`, error.message);
  }
}

async function checkAndResolve(contract) {
  const now = Math.floor(Date.now() / 1000);
  const toResolve = activeMarkets.filter(m => m.endTime <= now);
  for (const market of toResolve) {
    await resolveMarket(contract, market);
  }
}

async function createAllMarkets(contract) {
  const price = await fetchBTCPrice();
  if (price === null) return;
  for (const interval of INTERVALS_MINUTES) {
    await createMarket(contract, price, interval);
  }
}

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const contract = await hre.ethers.getContractAt("BettingMarket", CONTRACT_ADDRESS, signer);
  console.log("BTC Oracle elindult. Időtávok:", INTERVALS_MINUTES.join(", "), "perc");

  // Kezdeti piacok
  await createAllMarkets(contract);

  // Lejáratok folyamatos ellenőrzése
  setInterval(async () => {
    await checkAndResolve(contract);
  }, RESOLUTION_CHECK_MS);

  // Új piacok minden CREATION_INTERVAL_MS időközönként
  setInterval(async () => {
    await createAllMarkets(contract);
  }, CREATION_INTERVAL_MS);
}

main().catch(console.error);
