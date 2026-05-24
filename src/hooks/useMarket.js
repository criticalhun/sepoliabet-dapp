import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS } from '../contracts/contractAddress';
import BettingMarketABI from '../contracts/BettingMarket.json';

// Segédfüggvény a szerződés eléréséhez
const getContract = (providerOrSigner) => {
  return new ethers.Contract(CONTRACT_ADDRESS, BettingMarketABI, providerOrSigner);
};

// Piacok adatainak lekérése
const fetchMarkets = async (provider) => {
  const contract = getContract(provider);
  const count = await contract.marketCount();
  const marketList = [];
  for (let i = 1; i <= count; i++) {
    const market = await contract.markets(i);
    marketList.push({
      id: i,
      creator: market.creator,
      question: market.question,
      endTime: Number(market.endTime),
      totalYesAmount: ethers.formatEther(market.totalYesAmount),
      totalNoAmount: ethers.formatEther(market.totalNoAmount),
      resolved: market.resolved,
      winningOutcome: market.winningOutcome,
    });
  }
  return marketList;
};

export const useMarkets = () => {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let provider;
    let contract;

    const init = async () => {
      if (!window.ethereum) return;
      provider = new ethers.BrowserProvider(window.ethereum);
      contract = getContract(provider);

      const load = async () => {
        try {
          const list = await fetchMarkets(provider);
          setMarkets(list);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };

      await load();

      // Eseményfigyelők bekapcsolása
      const handleUpdate = () => {
        console.log('Esemény érkezett, frissítés...');
        load();
      };

      contract.on('MarketCreated', handleUpdate);
      contract.on('BetPlaced', handleUpdate);
      contract.on('MarketResolved', handleUpdate);
      contract.on('WinningsClaimed', handleUpdate);

      // Cleanup
      return () => {
        contract.off('MarketCreated', handleUpdate);
        contract.off('BetPlaced', handleUpdate);
        contract.off('MarketResolved', handleUpdate);
        contract.off('WinningsClaimed', handleUpdate);
      };
    };

    init();
  }, []);

  return { markets, loading };
};

export const useMarket = (id) => {
  const [market, setMarket] = useState(null);

  useEffect(() => {
    if (!id || !window.ethereum) return;
    let provider;
    let contract;

    const init = async () => {
      provider = new ethers.BrowserProvider(window.ethereum);
      contract = getContract(provider);

      const load = async () => {
        try {
          const data = await contract.markets(id);
          setMarket({
            id: Number(id),
            creator: data.creator,
            question: data.question,
            endTime: Number(data.endTime),
            totalYesAmount: ethers.formatEther(data.totalYesAmount),
            totalNoAmount: ethers.formatEther(data.totalNoAmount),
            resolved: data.resolved,
            winningOutcome: data.winningOutcome,
          });
        } catch (e) {
          console.error(e);
        }
      };

      await load();

      // Csak az adott piac eseményeit figyeljük
      const handleUpdate = (marketId) => {
        if (Number(marketId) === Number(id)) {
          console.log(`Piac #${id} frissítése...`);
          load();
        }
      };

      contract.on('BetPlaced', handleUpdate);
      contract.on('MarketResolved', handleUpdate);
      contract.on('WinningsClaimed', handleUpdate);

      return () => {
        contract.off('BetPlaced', handleUpdate);
        contract.off('MarketResolved', handleUpdate);
        contract.off('WinningsClaimed', handleUpdate);
      };
    };

    init();
  }, [id]);

  return market;
};
