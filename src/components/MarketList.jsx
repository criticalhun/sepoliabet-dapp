import { useMarkets } from '../hooks/useMarket';
import BetCard from './BetCard';
import Spinner from './Spinner';

export default function MarketList() {
  const { markets, loading } = useMarkets();

  if (loading) return <Spinner />;
  if (!markets || markets.filter(m => !m.resolved).length === 0)
    return <p className="text-gray-400 text-center py-20 text-lg">Még nincs aktív piac.</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {markets.filter(m => !m.resolved).map((market, index) => (
        <BetCard key={market.id} market={market} index={index} />
      ))}
    </div>
  );
}
