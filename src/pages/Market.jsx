import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useMarket } from '../hooks/useMarket';
import { usePlaceBet, useClaim, useResolveMarket } from '../hooks/useBetting';
import { useAccount } from 'wagmi';
import { getOwner } from '../services/contractService';

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

  useEffect(() => {
    if (address) {
      getOwner().then(owner => setIsOwner(owner.toLowerCase() === address.toLowerCase())).catch(console.error);
    }
  }, [address]);

  if (!market) return <p className="text-gray-400">Betöltés...</p>;

  const handleBet = async () => {
    try { await bet(id, outcome, amount); alert('Fogadás sikeres!'); } 
    catch (e) { alert('Hiba: ' + e.message); }
  };
  const handleClaim = async () => {
    try { await claim(id); alert('Nyeremény kivéve!'); } 
    catch (e) { alert('Hiba: ' + e.message); }
  };
  const handleResolve = async (winningOutcome) => {
    try { await resolve(id, winningOutcome); alert('Piac feloldva!'); } 
    catch (e) { alert('Hiba: ' + e.message); }
  };

  const isEnded = Date.now() / 1000 > market.endTime;
  const isResolved = market.resolved;

  return (
    <div className="max-w-lg mx-auto bg-gray-800 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-2">{market.question}</h2>
      <div className="text-gray-400 mb-4">
        <p>IGEN tét: {market.totalYesAmount} ETH</p>
        <p>NEM tét: {market.totalNoAmount} ETH</p>
        <p>Lejárat: {new Date(market.endTime * 1000).toLocaleString()}</p>
        {isResolved && <p className="text-yellow-400 font-bold">Eredmény: {market.winningOutcome ? 'IGEN' : 'NEM'}</p>}
      </div>

      {!isResolved && !isEnded && address && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <button onClick={() => setOutcome(true)} className={`px-4 py-2 rounded ${outcome ? 'bg-green-600' : 'bg-gray-700'}`}>IGEN</button>
            <button onClick={() => setOutcome(false)} className={`px-4 py-2 rounded ${!outcome ? 'bg-red-600' : 'bg-gray-700'}`}>NEM</button>
          </div>
          <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2 rounded bg-gray-700 border border-gray-600" placeholder="ETH összeg" />
          <button onClick={handleBet} disabled={betLoading} className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded disabled:opacity-50">{betLoading ? 'Folyamatban...' : 'Fogadás'}</button>
        </div>
      )}

      {isResolved && address && (
        <button onClick={handleClaim} disabled={claimLoading} className="w-full bg-yellow-600 hover:bg-yellow-700 py-2 rounded mt-4">{claimLoading ? 'Kivétel...' : 'Nyeremény kivétele'}</button>
      )}

      {!address && <p className="text-red-400">Csatlakoztasd a tárcádat a fogadáshoz.</p>}
      {isEnded && !isResolved && <p className="text-yellow-400">A piac lejárt, várj a feloldásra.</p>}

      {isOwner && !isResolved && isEnded && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <h3 className="text-lg font-semibold mb-2">Piac feloldása (owner)</h3>
          <div className="flex gap-4">
            <button onClick={() => handleResolve(true)} disabled={resolveLoading} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded">IGEN nyert</button>
            <button onClick={() => handleResolve(false)} disabled={resolveLoading} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded">NEM nyert</button>
          </div>
        </div>
      )}
    </div>
  );
}
