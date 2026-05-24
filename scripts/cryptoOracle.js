const hre = require("hardhat");
const axios = require("axios");

const CONTRACT_ADDRESS = "0xEB5CE903C786aC64c3Db673944fABB45f341b4Cb";
const INTERVALS_MINUTES = [5, 15, 30, 45, 60];
const CREATION_INTERVAL_MS = 5 * 60 * 1000;
const RESOLUTION_CHECK_MS = 45 * 1000;
const TX_DELAY_MS = 8000; // 8 mp delay tranzakciók között

const CRYPTOS = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "BNB", name: "BNB" },
];

let activeMarkets = [];

// Segédfüggvény: várakozás
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Segédfüggvény: retry logika
async function withRetry(fn, retries = 3, delayMs = 15000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      const isLimit = e.message.includes('in-flight') || e.message.includes('nonce');
      if (isLimit && i < retries - 1) {
        console.log(`  ⏳ Limit elérve, várakozás ${delayMs/1000}s... (${i+1}/${retries})`);
        await sleep(delayMs);
      } else {
        throw e;
      }
    }
  }
}

async function fetchPrices() {
  try {
    const symbols = CRYPTOS.map(c => c.symbol).join(",");
    const response = await axios.get(
      "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest",
      {
        params: { symbol: symbols, convert: "USD" },
        headers: { "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY },
        timeout: 10000,
      }
    );
    const prices = {};
    for (const crypto of CRYPTOS) {
      prices[crypto.symbol] = response.data.data[crypto.symbol][0].quote.USD.price;
    }
    return prices;
  } catch (e) {
    console.error("API hiba:", e.message);
    return null;
  }
}

async function createMarket(contract, symbol, startPrice, intervalMinutes) {
  const now = Math.floor(Date.now() / 1000);
  const endTime = now + intervalMinutes * 60;
  const question = `${symbol} árfolyam: ${startPrice.toFixed(2)} USD | Magasabb? | Lejárat: ${new Date(endTime * 1000).toLocaleString()}`;

  await withRetry(async () => {
    const tx = await contract.createMarket(question, endTime);
    await tx.wait();
    const marketCount = await contract.marketCount();
    const marketId = Number(marketCount);
    activeMarkets.push({ marketId, symbol, startPrice, endTime, interval: intervalMinutes });
    console.log(`  ✓ Piac #${marketId} (${symbol} ${intervalMinutes}p): ${startPrice.toFixed(2)} USD`);
  });
}

async function resolveMarket(contract, market) {
  const prices = await fetchPrices();
  if (!prices) return;
  const currentPrice = prices[market.symbol];
  const outcome = currentPrice > market.startPrice;

  try {
    await withRetry(async () => {
      const tx = await contract.resolveMarket(market.marketId, outcome);
      await tx.wait();
    });
    console.log(`  ✓ Feloldva #${market.marketId} ${market.symbol}: ${outcome ? "FEL" : "LE"} (${market.startPrice.toFixed(2)} → ${currentPrice.toFixed(2)})`);
    activeMarkets = activeMarkets.filter(m => m.marketId !== market.marketId);
  } catch (e) {
    console.error(`  ✗ Feloldási hiba #${market.marketId}:`, e.message.slice(0, 80));
  }
}

async function checkAndResolve(contract) {
  const now = Math.floor(Date.now() / 1000);
  const expired = activeMarkets.filter(m => m.endTime <= now);
  if (expired.length === 0) return;

  console.log(`\n⏰ ${expired.length} piac lejárt, feloldás...`);
  for (const m of expired) {
    await resolveMarket(contract, m);
    await sleep(TX_DELAY_MS); // delay feloldások között
  }
}

async function createAllMarkets(contract) {
  const prices = await fetchPrices();
  if (!prices) { console.log("  ✗ Árak nem elérhetők, kihagyva."); return; }

  console.log(`\n--- Piacok létrehozása (${new Date().toLocaleTimeString()}) ---`);
  for (const crypto of CRYPTOS) {
    for (const interval of INTERVALS_MINUTES) {
      try {
        await createMarket(contract, crypto.symbol, prices[crypto.symbol], interval);
        await sleep(TX_DELAY_MS); // delay minden piac között
      } catch (e) {
        console.error(`  ✗ Kihagyva (${crypto.symbol} ${interval}p):`, e.message.slice(0, 60));
        await sleep(TX_DELAY_MS * 2); // hosszabb delay hiba után
      }
    }
  }
}

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const contract = await hre.ethers.getContractAt("BettingMarket", CONTRACT_ADDRESS, signer);
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log(`🚀 Multi-kripto Oracle`);
  console.log(`   Cím: ${signer.address}`);
  console.log(`   Egyenleg: ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`   Kriptók: ${CRYPTOS.map(c => c.symbol).join(", ")}`);
  console.log(`   Időtávok: ${INTERVALS_MINUTES.join(", ")} perc`);
  console.log(`   TX delay: ${TX_DELAY_MS/1000}s tranzakciónként\n`);

  // Első kör
  await createAllMarkets(contract);

  // Feloldás ellenőrzése
  setInterval(async () => {
    try { await checkAndResolve(contract); } catch (e) { console.error("Feloldás hiba:", e.message); }
  }, RESOLUTION_CHECK_MS);

  // Új piacok létrehozása
  setInterval(async () => {
    try { await createAllMarkets(contract); } catch (e) { console.error("Létrehozás hiba:", e.message); }
  }, CREATION_INTERVAL_MS);
}

main().catch(e => {
  console.error("Fatális hiba:", e.message);
  process.exit(1);
});
