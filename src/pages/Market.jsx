import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useMarket } from '../hooks/useMarket';
import { usePlaceBet, useClaim, useResolveMarket } from '../hooks/useBetting';
import { useAccount } from 'wagmi';
import { getOwner, getUserBets } from '../services/contractService';
import GlassCard from '../components/GlassCard';
import GradientButton from '../components/GradientButton';
import Spinner from '../components/Spinner';
import CryptoChart from '../components/CryptoChart';

export default function Market() {
  const { id } = useParams();
  const market = useMarket(id);
  const { address } = useAccount();
  const { bet, isLoading: betLoading } = usePlaceBet();
  const { claim, isLoading: claimLoading } = useClaim();
  const { resolve, isLoading: resolveLoading } = useResolveMarket();

  const [amount, setAmount] = useState('0.01');
  const [outcome, setOutcome] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [userBets, setUserBets] = useState({ yes: '0', no: '0' });
  const [claimed, setClaimed] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [chartOpen, setChartOpen] = useState(true); // chart toggle

  useEffect(() => {
    if (address) {
      getOwner()
        .then(owner => setIsOwner(owner.toLowerCase() === address.toLowerCase()))
        .catch(console.error);
    }
  }, [address]);

  useEffect(() => {
    if (!address || !id || !market) return;
    getUserBets(id, address).then(bets => {
      setUserBets(bets);
      if (market.resolved) {
        const hasWin = market.winningOutcome
          ? parseFloat(bets.yes) > 0
          : parseFloat(bets.no) > 0;
        setCanClaim(hasWin && !claimed);
      }
    }).catch(console.error);
  }, [id, address, market?.resolved, claimed]);

  const handleBet = useCallback(async () => {
    try { await bet(id, outcome, amount); }
    catch (e) { console.error(e); }
  }, [id, outcome, amount, bet]);

  const handleClaim = useCallback(async () => {
    try {
      await claim(id);
      setClaimed(true);
      setCanClaim(false);
    } catch (e) {
      if (e.message?.includes('Already claimed')) { setClaimed(true); setCanClaim(false); }
    }
  }, [id, claim]);

  const handleResolve = useCallback(async (wo) => {
    try { await resolve(id, wo); }
    catch (e) { console.error(e); }
  }, [id, resolve]);

  // Árfolyam kinyerése a kérdésből
  const priceMatch = useMemo(() =>
    market?.question.match(/árfolyam:\s*([\d.]+)\s*USD/),
    [market?.question]
  );

  // Kripto szimbólum meghatározása
  const cryptoSymbol = useMemo(() => {
    const q = market?.question || '';
    if (q.includes('ETH')) return 'ETH';
    if (q.includes('SOL')) return 'SOL';
    if (q.includes('BNB')) return 'BNB';
    return 'BTC';
  }, [market?.question]);

  if (!market) return <Spinner />;

  const isEnded = Date.now() / 1000 > market.endTime;
  const isResolved = market.resolved;
  const isBtcStyle = !!priceMatch;

  const QUICK_BETS = ['0.01', '0.05', '0.1', '0.5'];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Kétoszlopos layout desktopra */}
      <div className={`flex flex-col ${isBtcStyle ? 'lg:flex-row lg:gap-6' : ''}`}>

        {/* BAL OLDAL: Chart (csak BTC-stílusú piacoknál) */}
        {isBtcStyle && (
          <div className="lg:flex-1 lg:min-w-0">
            {/* Chart toggle gomb */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                {cryptoSymbol}/USDT Grafikon
              </h3>
              <button
                onClick={() => setChartOpen(o => !o)}
                className="text-xs text-gray-500 hover:text-gray-300 transition px-2 py-1 rounded border border-gray-700"
              >
                {chartOpen ? '▲ Bezárás' : '▼ Megnyitás'}
              </button>
            </div>

            {chartOpen && (
              <div className="rounded-xl overflow-hidden border border-surface-700 mb-4 lg:mb-0">
                <CryptoChart symbol={cryptoSymbol} height={280} />
              </div>
            )}
          </div>
        )}

        {/* JOBB OLDAL: Fogadási panel */}
        <div className={isBtcStyle ? 'lg:w-80 lg:flex-shrink-0' : 'w-full max-w-lg mx-auto'}>
          {/* Sticky a desktopra */}
          <div className="lg:sticky lg:top-20">
            <GlassCard>
              {/* Cím */}
              <div className="mb-4">
                {priceMatch ? (
                  <>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      Kiindulóár
                    </p>
                    <p className="text-2xl font-bold font-mono text-brand-400">
                      ${priceMatch[1]}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Magasabb lesz?: {new Date(market.endTime * 1000).toLocaleString()}
                    </p>
                  </>
                ) : (
                  <h2 className="text-lg font-bold leading-snug">{market.question}</h2>
                )}
              </div>

              {/* Tétek */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-green-950/40 rounded-lg p-3 text-center border border-green-900/30">
                  <p className="text-xs text-green-500 uppercase tracking-wider">FEL tét</p>
                  <p className="text-base font-bold font-mono text-green-400">
                    {market.totalYesAmount} ETH
                  </p>
                </div>
                <div className="bg-red-950/40 rounded-lg p-3 text-center border border-red-900/30">
                  <p className="text-xs text-red-500 uppercase tracking-wider">LE tét</p>
                  <p className="text-base font-bold font-mono text-red-400">
                    {market.totalNoAmount} ETH
                  </p>
                </div>
              </div>

              {/* Eredmény */}
              {isResolved && (
                <div className={`text-center py-2 px-3 rounded-lg mb-4 font-bold ${
                  market.winningOutcome
                    ? 'bg-green-900/30 text-green-300 border border-green-700/30'
                    : 'bg-red-900/30 text-red-300 border border-red-700/30'
                }`}>
                  Eredmény: {market.winningOutcome ? '📈 FEL' : '📉 LE'}
                </div>
              )}

              {/* Fogadási form */}
              {!isResolved && !isEnded && address && (
                <div className="space-y-3">
                  {/* FEL / LE gombok */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setOutcome(true)}
                      className={`py-2.5 rounded-lg font-semibold text-sm transition-all ${
                        outcome
                          ? 'bg-green-600 text-white shadow-lg shadow-green-900/30'
                          : 'bg-surface-800 text-gray-400 hover:bg-surface-700'
                      }`}
                    >
                      📈 FEL
                    </button>
                    <button
                      onClick={() => setOutcome(false)}
                      className={`py-2.5 rounded-lg font-semibold text-sm transition-all ${
                        !outcome
                          ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                          : 'bg-surface-800 text-gray-400 hover:bg-surface-700'
                      }`}
                    >
                      📉 LE
                    </button>
                  </div>

                  {/* Quick bet gombok */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {QUICK_BETS.map(q => (
                      <button
                        key={q}
                        onClick={() => setAmount(q)}
                        className={`py-1 text-xs rounded font-mono transition ${
                          amount === q
                            ? 'bg-brand-600 text-white'
                            : 'bg-surface-800 text-gray-400 hover:bg-surface-700'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  {/* Összeg input */}
                  <div className="flex items-center gap-2 bg-surface-800 border border-surface-600 rounded-lg px-3 py-2">
                    <span className="text-gray-500 text-sm">ETH</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.001"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="flex-1 bg-transparent text-white font-mono text-sm focus:outline-none"
                      placeholder="0.01"
                    />
                  </div>

                  <GradientButton
                    onClick={handleBet}
                    disabled={betLoading}
                    className="w-full py-3"
                  >
                    {betLoading ? 'Folyamatban...' : `Fogadás – ${outcome ? '📈 FEL' : '📉 LE'}`}
                  </GradientButton>
                </div>
              )}

              {/* Nyeremény kivétel */}
              {canClaim && address && (
                <GradientButton onClick={handleClaim} disabled={claimLoading} className="w-full mt-3">
                  {claimLoading ? 'Kivétel...' : '💰 Nyeremény kivétele'}
                </GradientButton>
              )}
              {claimed && (
                <p className="text-green-400 text-sm text-center mt-2">✓ Nyeremény kivéve!</p>
              )}
              {isResolved && address && !canClaim && !claimed && (
                <p className="text-gray-500 text-xs text-center mt-2">Ezen a piacon nem volt nyerő fogadásod.</p>
              )}

              {!address && (
                <p className="text-red-400 text-sm text-center mt-2">Csatlakoztasd a tárcádat.</p>
              )}
              {isEnded && !isResolved && (
                <p className="text-yellow-400 text-sm text-center mt-2">A piac lejárt, feloldásra vár.</p>
              )}

              {/* Owner panel */}
              {isOwner && !isResolved && isEnded && (
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Owner – Feloldás</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleResolve(true)}
                      disabled={resolveLoading}
                      className="py-2 bg-green-700 hover:bg-green-600 text-white text-sm rounded-lg transition"
                    >
                      FEL nyert
                    </button>
                    <button
                      onClick={() => handleResolve(false)}
                      disabled={resolveLoading}
                      className="py-2 bg-red-700 hover:bg-red-600 text-white text-sm rounded-lg transition"
                    >
                      LE nyert
                    </button>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
