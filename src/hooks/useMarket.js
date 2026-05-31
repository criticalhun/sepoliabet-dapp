import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS } from '../contracts/contractAddress';
import BettingMarketABI from '../contracts/BettingMarket.json';

const MAX_MARKETS = 80; // csak az utolsó 80 piac

const getContract = (provider) =>
  new ethers.Contract(CONTRACT_ADDRESS, BettingMarketABI, provider);

async function fetchOne(contract, id) {
  const m = await contract.markets(id);
  return {
    id: Number(id),
    creator: m.creator,
    question: m.question,
    endTime: Number(m.endTime),
    totalYesAmount: ethers.formatEther(m.totalYesAmount),
    totalNoAmount: ethers.formatEther(m.totalNoAmount),
    resolved: m.resolved,
    winningOutcome: m.winningOutcome,
  };
}

export const useMarkets = () => {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!window.ethereum) return;
    let cancelled = false;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = getContract(provider);

    // Kezdeti betöltés: párhuzamosan, csak az utolsó MAX_MARKETS
    const loadAll = async () => {
      try {
        const count = Number(await contract.marketCount());
        if (count === 0) { setLoading(false); return; }

        const start = Math.max(1, count - MAX_MARKETS + 1);
        const ids = Array.from({ length: count - start + 1 }, (_, i) => start + i);

        // Promise.all = párhuzamos kérések (nem egymás után!)
        const results = await Promise.all(ids.map(id => fetchOne(contract, id)));
        if (!cancelled) {
          setMarkets(results.reverse()); // legújabb elöl
          setLoading(false);
        }
      } catch (e) {
        console.error('useMarkets hiba:', e);
        if (!cancelled) setLoading(false);
      }
    };

    loadAll();

    // Okos eseménykezelők: csak a változott piacot frissíti, nem tölt újra mindent

    const onNewMarket = async (marketId) => {
      if (cancelled) return;
      try {
        const data = await fetchOne(contract, Number(marketId));
        setMarkets(prev => [data, ...prev.filter(m => m.id !== data.id)].slice(0, MAX_MARKETS));
      } catch (e) { console.error(e); }
    };

    const onMarketChanged = async (marketId) => {
      if (cancelled) return;
      const id = Number(marketId);
      try {
        const data = await fetchOne(contract, id);
        setMarkets(prev => prev.map(m => m.id === id ? data : m));
      } catch (e) { console.error(e); }
    };

    contract.on('MarketCreated', onNewMarket);
    contract.on('BetPlaced', onMarketChanged);
    contract.on('MarketResolved', onMarketChanged);
    contract.on('WinningsClaimed', onMarketChanged);

    return () => {
      cancelled = true;
      contract.off('MarketCreated', onNewMarket);
      contract.off('BetPlaced', onMarketChanged);
      contract.off('MarketResolved', onMarketChanged);
      contract.off('WinningsClaimed', onMarketChanged);
    };
  }, []);

  return { markets, loading };
};

export const useMarket = (id) => {
  const [market, setMarket] = useState(null);

  useEffect(() => {
    if (!id || !window.ethereum) return;
    let cancelled = false;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = getContract(provider);

    const load = () =>
      fetchOne(contract, Number(id))
        .then(data => { if (!cancelled) setMarket(data); })
        .catch(console.error);

    load();

    // Csak az adott piac eseményeit figyeli
    const handle = (marketId) => {
      if (Number(marketId) === Number(id)) load();
    };

    contract.on('BetPlaced', handle);
    contract.on('MarketResolved', handle);
    contract.on('WinningsClaimed', handle);

    return () => {
      cancelled = true;
      contract.off('BetPlaced', handle);
      contract.off('MarketResolved', handle);
      contract.off('WinningsClaimed', handle);
    };
  }, [id]);

  return market;
};
