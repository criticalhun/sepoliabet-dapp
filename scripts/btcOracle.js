const hre = require("hardhat");
const axios = require("axios");

const CONTRACT_ADDRESS = "0xEB5CE903C786aC64c3Db673944fABB45f341b4Cb"; // a te címed
const INTERVAL_MS = 5 * 60 * 1000; // 5 perc

// Piacok nyilvántartása: { marketId: startPrice }
const activeMarkets = {};

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
    console.log(`Jelenlegi BTC ár: ${price} USD`);
    return price;
  } catch (error) {
    console.error("Hiba az API hívásban:", error.message);
    return null;
  }
}

async function createMarket(contract, startPrice, endTime) {
  const question = `BTC ára > ${startPrice.toFixed(2)} USD ekkor: ${new Date(endTime * 1000).toLocaleString()}`;
  const tx = await contract.createMarket(question, endTime);
  const receipt = await tx.wait();
  // A MarketCreated eseményből kiolvassuk az id-t (az egyszerűség kedvéért most a marketCount-ból számoljuk)
  const marketCount = await contract.marketCount();
  const marketId = Number(marketCount);
  activeMarkets[marketId] = startPrice;
  console.log(`Piac létrehozva: #${marketId} – "${question}"`);
}

async function resolveMarket(contract, marketId, startPrice) {
  const currentPrice = await fetchBTCPrice();
  if (currentPrice === null) {
    console.error(`Nem sikerült lekérni az árat a(z) #${marketId} piac feloldásához.`);
    return;
  }
  const outcome = currentPrice > startPrice; // true = IGEN
  try {
    const tx = await contract.resolveMarket(marketId, outcome);
    await tx.wait();
    console.log(`Piac #${marketId} feloldva: ${outcome ? "IGEN" : "NEM"} (kezdő: ${startPrice}, jelenlegi: ${currentPrice})`);
    delete activeMarkets[marketId];
  } catch (error) {
    console.error(`Feloldási hiba #${marketId}:`, error.message);
  }
}

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const contract = await hre.ethers.getContractAt("BettingMarket", CONTRACT_ADDRESS, signer);
  console.log("BTC Oracle elindult. 5 percenként új piac...");

  // Első piac létrehozása azonnal
  const startPrice = await fetchBTCPrice();
  if (startPrice !== null) {
    const now = Math.floor(Date.now() / 1000);
    const endTime = now + INTERVAL_MS / 1000;
    await createMarket(contract, startPrice, endTime);
  }

  // Időzítő beállítása
  setInterval(async () => {
    // Először a lejárt piacok feloldása (amiknek az endTime <= most)
    const now = Math.floor(Date.now() / 1000);
    for (const [marketIdStr, startPrice] of Object.entries(activeMarkets)) {
      const marketId = Number(marketIdStr);
      const market = await contract.markets(marketId);
      if (market.endTime <= now && !market.resolved) {
        await resolveMarket(contract, marketId, startPrice);
      }
    }

    // Új piac létrehozása
    const newPrice = await fetchBTCPrice();
    if (newPrice !== null) {
      const nextEndTime = now + INTERVAL_MS / 1000;
      await createMarket(contract, newPrice, nextEndTime);
    }
  }, INTERVAL_MS);
}

main().catch(console.error);
