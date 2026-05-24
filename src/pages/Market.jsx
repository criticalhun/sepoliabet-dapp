import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useMarket } from '../hooks/useMarket';
import { usePlaceBet, useClaim, useResolveMarket } from '../hooks/useBetting';
import { useAccount } from 'wagmi';
import { getOwner, getUserBets } from '../services/contractService';
import GlassCard from '../components/GlassCard';
import GradientButton from '../components/GradientButton';
import Spinner from '../components/Spinner';
import BTCChart from '../components/BTCChart';

const isBTCMarket = (q) => q && (q.startsWith('BTC') || q.includes('árfolyam'));

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

  // Owner ellenőrzés
  useEffect(() => {
    if (!address) return;
    getOwner()
      .then(owner => setIsOwner(owner.toLowerCase() === address.toLowerCase()))
      .catch(console.error);
  }, [address]);

  // Felhasználó saját tétjeinek lekérése
  useEffect(() => {
    if (!address || !id || !market) return;
    getUserBets(id, address)
      .then(setUserBets)
      .catch(console.error);
  }, [id, address, market]);

  if (!market) return <Spinner />;

  const isEnded = Date.now() / 1000 > market.endTime;
  const isResolved = market.resolved;

  // Van-e nyertes tét?
  const hasYesBet = parseFloat(userBets.yes) > 0;
  const hasNoBet = parseFloat(userBets.no) > 0;
  const hasBet = hasYesBet || hasNoBet;

  // Nyerhet-e a felhasználó?
  const canClaim = isResolved && !claimed && (
    (market.winningOutcome && hasYesBet) ||
    (!market.winningOutcome && hasNoBet)
  );

  const handleBet = async () => {
    try {
      await bet(id, outcome, amount);
      alert('Fogadás sikeres!');
    } catch (e) {
      alert('Hiba: ' + e.message);
    }
  };

  const handleClaim = async () => {
    try {
      await claim(id);
      alert('Nyeremény kivéve!');
      setClaimed(true);
    } catch (e) {
      if (e.message.includes('Already claimed')) {
        alert('Már kivetted a nyereményt.');
        setClaimed(true);
      } else {
        alert('Hiba: ' + e.message);
      }
    }
  };

  const handleResolve = async (winOut) => {
    try {
      await resolve(id, winOut);
      alert('Piac feloldva!');
    } catch (e) {
      alert('Hiba: ' + e.message);
    }
  };

  // Kérdés megjelenítése
  const priceMatch = market.question.match(/[\d]{4,6}\.?\d{0,2}/);
  const displayPrice = priceMatch ? priceMatch[0] : null;

  return (
    <div className="max-w-xl mx-auto">

      {/* BTC grafikon – csak BTC piacoknál */}
      {isBTCMarket(market.question) && <BTCChart />}

      <GlassCard>
        {/* Cím */}
        <h2 className="text-xl font-bold mb-1 text-white">
          {isBTCMarket(market.question) && displayPrice
            ? <>BTC árfolyam: <span className="text-brand-400">{displayPrice} USD</span></>
            : market.question
          }
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Lejárat: {new Date(market.endTime * 1000).toLocaleString()}
        </p>

        {/* Tét összesítők */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-surface-800/60 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider">FEL tét</p>
            <p className="text-lg font-semibold text-green-400">{market.totalYesAmount} ETH</p>
            {hasYesBet && <p className="text-xs text-green-300">Saját: {userBets.yes} ETH</p>}
          </div>
          <div className="bg-surface-800/60 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider">LE tét</p>
            <p className="text-lg font-semibold text-red-400">{market.totalNoAmount} ETH</p>
            {hasNoBet && <p className="text-xs text-red-300">Saját: {userBets.no} ETH</p>}
          </div>
        </div>

        {/* Eredmény sáv */}
        {isResolved && (
          <div className={`text-center py-2 rounded-lg mb-4 font-bold text-lg ${
            market.winningOutcome ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'
          }`}>
            Eredmény: {market.winningOutcome ? '↑ FEL' : '↓ LE'}
          </div>
        )}

        {/* Fogadási panel – csak ha aktív és be van jelentkezve */}
        {!isResolved && !isEnded && address && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                onClick={() => setOutcome(true)}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
                  outcome ? 'bg-green-600 text-white shadow-glow' : 'bg-surface-700 text-gray-400'
                }`}
              >
                ↑ FEL
              </button>
              <button
                onClick={() => setOutcome(false)}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
                  !outcome ? 'bg-red-600 text-white' : 'bg-surface-700 text-gray-400'
                }`}
              >
                ↓ LE
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-surface-800 border border-surface-600 rounded-lg py-2 px-3 text-white text-sm"
              placeholder="ETH összeg (pl. 0.01)"
            />
            <GradientButton onClick={handleBet} disabled={betLoading} className="w-full">
              {betLoading ? 'Tranzakció...' : 'Fogadás'}
            </GradientButton>
          </div>
        )}

        {/* Nyeremény kivétele – CSAK ha valóban nyert */}
        {canClaim && (
          <GradientButton onClick={handleClaim} disabled={claimLoading} className="w-full mt-4">
            {claimLoading ? 'Kivétel...' : '🏆 Nyeremény kivétele'}
          </GradientButton>
        )}

        {/* Sikeres kivétel jelzése */}
        {claimed && (
          <p className="text-green-400 text-sm text-center mt-4">✓ Nyeremény sikeresen kivéve!</p>
        )}

        {/* Nem fogadott a nyertes oldalra */}
        {isResolved && hasBet && !canClaim && !claimed && (
          <p className="text-gray-400 text-sm text-center mt-4">
            Nem a nyertes oldalra fogadtál.
          </p>
        )}

        {/* Nem fogadott erre a piacra */}
        {isResolved && !hasBet && (
          <p className="text-gray-400 text-sm text-center mt-4">
            Nem vettél részt ezen a piacon.
          </p>
        )}

        {/* Állapotüzenetek */}
        {!address && (
          <p className="text-yellow-400 text-sm text-center mt-4">
            Csatlakoztasd a tárcádat a fogadáshoz.
          </p>
        )}
        {isEnded && !isResolved && (
          <p className="text-yellow-400 text-sm text-center mt-4">
            A piac lejárt – feloldásra vár.
          </p>
        )}

        {/* Owner feloldás panel – csak ha lejárt és nem oldott */}
        {isOwner && !isResolved && isEnded && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider text-gray-400">
              Kézi feloldás (owner)
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleResolve(true)}
                disabled={resolveLoading}
                className="flex-1 bg-green-700 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-medium transition"
              >
                ↑ FEL nyert
              </button>
              <button
                onClick={() => handleResolve(false)}
                disabled={resolveLoading}
                className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium transition"
              >
                ↓ LE nyert
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
