import { useState, useEffect } from 'react';
import { useMarkets } from '../hooks/useMarket';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { getUserBet } from '../services/contractService';
import GlassCard from '../components/GlassCard';
import Spinner from '../components/Spinner';
import GradientButton from '../components/GradientButton';

export default function Home() {
  const { markets, loading } = useMarkets();
  const { address } = useAccount();
  const [showResolved, setShowResolved] = useState(false);
  const [showMyBets, setShowMyBets] = useState(false);
  const [myMarkets, setMyMarkets] = useState([]);

  // Ha a felhasználó be van jelentkezve, szűrjük a piacokat a saját fogadásai alapján
  useEffect(() => {
    if (!address || markets.length === 0) {
      setMyMarkets([]);
      return;
    }
    const checkMyBets = async () => {
      const results = [];
      for (const market of markets) {
        try {
          const yesBet = await getUserBet(market.id, address, true);
          const noBet = await getUserBet(market.id, address, false);
          if (parseFloat(yesBet) > 0 || parseFloat(noBet) > 0) {
            results.push(market);
          }
        } catch (e) {
          console.error(e);
        }
      }
      setMyMarkets(results);
    };
    checkMyBets();
  }, [markets, address]);

  const activeMarkets = markets.filter(m => !m.resolved);
  const resolvedMarkets = markets.filter(m => m.resolved);

  // Kiválasztott lista a fül alapján
  let displayedMarkets;
  if (showMyBets) displayedMarkets = myMarkets;
  else if (showResolved) displayedMarkets = resolvedMarkets;
  else displayedMarkets = activeMarkets;

  const renderMarketCard = (market) => {
    const totalPool = parseFloat(market.totalYesAmount) + parseFloat(market.totalNoAmount);
    const yesPercent = totalPool > 0 ? (parseFloat(market.totalYesAmount) / totalPool * 100).toFixed(0) : 50;
    const noPercent = totalPool > 0 ? (parseFloat(market.totalNoAmount) / totalPool * 100).toFixed(0) : 50;
    const endDate = new Date(market.endTime * 1000);
    const isResolved = market.resolved;
    const winningOutcome = market.winningOutcome;
    const winningPool = isResolved ? (winningOutcome ? market.totalYesAmount : market.totalNoAmount) : null;

    return (
      <GlassCard key={market.id} className="h-full flex flex-col">
        <Link to={`/market/${market.id}`} className="flex flex-col h-full">
          <h3 className="font-semibold text-lg mb-2 flex-grow">{market.question}</h3>
          <div className="flex justify-between text-sm text-gray-400 mb-3">
            <span>{totalPool.toFixed(4)} ETH</span>
            <span>{endDate.toLocaleDateString()}</span>
          </div>
          {!isResolved ? (
            <div className="flex gap-2 text-sm">
              <span className="bg-green-900 text-green-300 px-2 py-1 rounded">IGEN {yesPercent}%</span>
              <span className="bg-red-900 text-red-300 px-2 py-1 rounded">NEM {noPercent}%</span>
            </div>
          ) : (
            <div className="text-sm space-y-1">
              <div className={`px-2 py-1 rounded font-bold ${winningOutcome ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
                Eredmény: {winningOutcome ? 'IGEN' : 'NEM'}
              </div>
              <div className="text-gray-300 text-xs">
                Nyereményalap: {winningPool} ETH
              </div>
            </div>
          )}
        </Link>
      </GlassCard>
    );
  };

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text">
        {showMyBets ? 'Saját fogadásaim' : showResolved ? 'Korábbi eredmények' : 'Aktív piacok'}
      </h1>
      <p className="text-gray-400 text-sm md:text-base mb-6">
        {showMyBets
          ? 'Piacok, ahol te is fogadtál.'
          : showResolved
          ? 'A múltbeli fogadások eredményei és nyereményei.'
          : 'Fedezd fel a fogadási lehetőségeket, és használd a tudásod.'}
      </p>

      {/* Váltó gombok */}
      <div className="flex flex-wrap gap-2 md:gap-3 mb-8">
        <GradientButton
          onClick={() => { setShowResolved(false); setShowMyBets(false); }}
          className={`px-3 py-2 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition ${
            !showResolved && !showMyBets ? '' : 'from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600'
          }`}
        >
          Aktív ({activeMarkets.length})
        </GradientButton>
        <GradientButton
          onClick={() => { setShowResolved(true); setShowMyBets(false); }}
          className={`px-3 py-2 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition ${
            showResolved && !showMyBets ? '' : 'from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600'
          }`}
        >
          Eredmények ({resolvedMarkets.length})
        </GradientButton>
        {address && (
          <GradientButton
            onClick={() => { setShowMyBets(true); setShowResolved(false); }}
            className={`px-3 py-2 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition ${
              showMyBets ? '' : 'from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600'
            }`}
          >
            Saját fogadásaim ({myMarkets.length})
          </GradientButton>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : displayedMarkets.length === 0 ? (
        <p className="text-gray-400 text-center py-10">
          {showMyBets ? 'Még nincs egyetlen fogadásod sem.' :
           showResolved ? 'Még nincs lezárt piac.' : 'Még nincs aktív piac.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {displayedMarkets.map(renderMarketCard)}
        </div>
      )}
    </div>
  );
}
