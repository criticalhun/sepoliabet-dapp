import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS } from '../contracts/contractAddress';
import BettingMarketABI from '../contracts/BettingMarket.json';

export function useLiveFeed() {
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    if (!window.ethereum) return;
    let cancelled = false;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, BettingMarketABI, provider);

    // Legutóbbi fogadások betöltése
    (async () => {
      try {
        const block = await provider.getBlockNumber();
        const evts = await contract.queryFilter(
          contract.filters.BetPlaced(), Math.max(0, block - 5000), 'latest'
        );
        if (cancelled) return;
        setFeed(evts.slice(-15).reverse().map(e => ({
          id:       e.transactionHash,
          marketId: Number(e.args[0]),
          address:  e.args[1],
          outcome:  e.args[2],
          amount:   parseFloat(ethers.formatEther(e.args[3])).toFixed(4),
          time:     Date.now() - Math.floor(Math.random() * 600000),
          live:     false,
        })));
      } catch {}
    })();

    // Valós idejű fogadás-figyelő
    const handler = (marketId, bettor, outcome, amount, event) => {
      if (cancelled) return;
      setFeed(prev => [{
        id:       event.transactionHash || String(Date.now()),
        marketId: Number(marketId),
        address:  bettor,
        outcome,
        amount:   parseFloat(ethers.formatEther(amount)).toFixed(4),
        time:     Date.now(),
        live:     true,
      }, ...prev].slice(0, 20));
    };

    contract.on('BetPlaced', handler);
    return () => { cancelled = true; contract.off('BetPlaced', handler); };
  }, []);

  return feed;
}
