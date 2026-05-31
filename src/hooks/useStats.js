import { useMemo } from 'react';
import { useMarkets } from './useMarket';

export function useStats() {
  const { markets, loading } = useMarkets();

  return useMemo(() => {
    const active   = markets.filter(m => !m.resolved);
    const resolved = markets.filter(m => m.resolved);

    const totalVolume = markets.reduce((s, m) =>
      s + parseFloat(m.totalYesAmount) + parseFloat(m.totalNoAmount), 0);

    const tvl = active.reduce((s, m) =>
      s + parseFloat(m.totalYesAmount) + parseFloat(m.totalNoAmount), 0);

    return { loading, total: markets.length, active: active.length, resolved: resolved.length, totalVolume, tvl };
  }, [markets, loading]);
}
