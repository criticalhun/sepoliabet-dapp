import { useState } from 'react';
import { placeBet, claimWinnings, resolveMarket } from '../services/contractService';

export const usePlaceBet = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const bet = async (marketId, outcomeYes, amountEth) => {
    setIsLoading(true);
    setError(null);
    try {
      const tx = await placeBet(marketId, outcomeYes, amountEth);
      return tx;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return { bet, isLoading, error };
};

export const useClaim = () => {
  const [isLoading, setIsLoading] = useState(false);
  const claim = async (marketId) => {
    setIsLoading(true);
    try {
      await claimWinnings(marketId);
    } finally {
      setIsLoading(false);
    }
  };
  return { claim, isLoading };
};

export const useResolveMarket = () => {
  const [isLoading, setIsLoading] = useState(false);
  const resolve = async (marketId, winningYes) => {
    setIsLoading(true);
    try {
      const tx = await resolveMarket(marketId, winningYes);
      return tx;
    } finally {
      setIsLoading(false);
    }
  };
  return { resolve, isLoading };
};
