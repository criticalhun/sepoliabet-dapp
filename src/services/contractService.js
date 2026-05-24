import { ethers } from 'ethers';
import BettingMarketABI from '../contracts/BettingMarket.json';
import { CONTRACT_ADDRESS } from '../contracts/contractAddress';

const getContract = async (signer) => {
  return new ethers.Contract(CONTRACT_ADDRESS, BettingMarketABI, signer);
};

export const createMarket = async (question, endTime) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = await getContract(signer);
  const tx = await contract.createMarket(question, endTime);
  await tx.wait();
  return tx;
};

export const placeBet = async (marketId, outcomeYes, amountInEth) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = await getContract(signer);
  const tx = await contract.placeBet(marketId, outcomeYes, {
    value: ethers.parseEther(amountInEth),
  });
  await tx.wait();
  return tx;
};

export const claimWinnings = async (marketId) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = await getContract(signer);
  const tx = await contract.claimWinnings(marketId);
  await tx.wait();
  return tx;
};

export const getMarketCount = async () => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, BettingMarketABI, provider);
  const count = await contract.marketCount();
  return Number(count);
};

export const getMarketData = async (marketId) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, BettingMarketABI, provider);
  const market = await contract.markets(marketId);
  return {
    creator: market.creator,
    question: market.question,
    endTime: Number(market.endTime),
    totalYesAmount: ethers.formatEther(market.totalYesAmount),
    totalNoAmount: ethers.formatEther(market.totalNoAmount),
    resolved: market.resolved,
    winningOutcome: market.winningOutcome,
  };
};
// src/services/contractService.js
export const resolveMarket = async (marketId, winningYes) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = await getContract(signer);
  const tx = await contract.resolveMarket(marketId, winningYes);
  await tx.wait();
  return tx;
};

// és kell egy getOwner függvény is:
export const getOwner = async () => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, BettingMarketABI, provider);
  return await contract.owner();
};
export const getUserBet = async (marketId, user, outcomeYes) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, BettingMarketABI, provider);
  const bet = await contract.getUserBet(marketId, user, outcomeYes);
  return ethers.formatEther(bet);
};

export const isClaimed = async (marketId, userAddress) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, BettingMarketABI, provider);
  // A szerződésben nincs közvetlen isClaimed függvény, de a claimWinnings hívásakor eltároljuk.
  // Használhatjuk a szerződés `claimed` mapping-jét, ami private, de van getter?
  // A te szerződésedben a `claimed` mapping nincs publikus getter, de a `claimWinnings` belsőleg ellenőrzi.
  // Egyszerűbb: megpróbáljuk hívni a claim-et, és ha visszadobja "Already claimed", akkor tudjuk.
  // De hogy ne terheljük a láncot, inkább a frontenden tároljuk, vagy a useMarket hook-ban a market objektumba beletesszük.
  // Mivel a szerződésben a `claimed` nem publikus, egy workaround: a `getUserBet` után a claim sikertelensége jelzi.
  // Most az egyszerűség kedvéért: a Market oldalon a `claimed` állapotot a `handleClaim` hibájából állítjuk be.
  return false; // placeholder
};
export const getUserBets = async (marketId, userAddress) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, BettingMarketABI, provider);
  const [yesBet, noBet] = await Promise.all([
    contract.getUserBet(marketId, userAddress, true),
    contract.getUserBet(marketId, userAddress, false),
  ]);
  return {
    yes: ethers.formatEther(yesBet),
    no: ethers.formatEther(noBet),
  };
};
