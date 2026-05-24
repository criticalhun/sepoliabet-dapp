import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMarket } from '../hooks/useMarket';
import { usePlaceBet, useClaim, useResolveMarket } from '../hooks/useBetting';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { getOwner, getUserBets } from '../services/contractService';
import CryptoChart from '../components/CryptoChart';
import Spinner from '../components/Spinner';

const CRYPTO_META = {
  BTC: { color: '#f7931a', label: 'Bitcoin', icon: '₿' },
  ETH: { color: '#627eea', label: 'Ethereum', icon: 'Ξ' },
  SOL: { color: '#9945ff', label: 'Solana', icon: '◎' },
  BNB: { color: '#f3ba2f', label: 'BNB', icon: 'B' },
};

function detectCrypto(q = '') {
  for (const k of Object.keys(CRYPTO_META)) if (q.startsWith(k)) return k;
  return null;
}

function StatBox({ label, value, sub, color }) {
  return (
    <div className="card px-4 py-3 text-center">
      <p className="label mb-1">{label}</p>
      <p className="mono text-base font-semibold" style={{ color: color || '#e2e8f0' }}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

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
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!address) return;
    getOwner().then(o => setIsOwner(o.toLowerCase() === address.toLowerCase())).catch(() => {});
  }, [address]);

  useEffect(() => {
    if (!address || !id || !market) return;
    getUserBets(id, address).then(setUserBets).catch(() => {});
  }, [id, address, market]);

  if (!market) return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Spinner />
    </div>
  );

  const crypto = detectCrypto(market.question);
  const meta = crypto ? CRYPTO_META[crypto] : null;
  const color = meta?.color || '#6366f1';

  const isEnded = Date.now() / 1000 > market.endTime;
  const isResolved = market.resolved;
  const hasYes = parseFloat(userBets.yes) > 0;
  const hasNo = parseFloat(userBets.no) > 0;
  const hasBet = hasYes || hasNo;
  const canClaim = isResolved && !claimed && (
    (market.winningOutcome && hasYes) || (!market.winningOutcome && hasNo)
  );

  const total = parseFloat(market.totalYesAmount) + parseFloat(market.totalNoAmount);
  const yesP = total > 0 ? (parseFloat(market.totalYesAmount) / total * 100) : 50;
  const priceMatch = market.question.match(/([\d,]+\.?\d{0,2}) USD/);
  const displayPrice = priceMatch ? priceMatch[1] : null;

  const showMsg = (text, type = 'info') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleBet = async () => {
    try {
      await bet(id, outcome, amount);
      showMsg('Fogadás sikeres!', 'success');
    } catch (e) {
      showMsg(e.message.includes('user rejected') ? 'Tranzakció elutasítva.' : 'Hiba: ' + e.message, 'error');
    }
  };

  const handleClaim = async () => {
    try {
      await claim(id);
      setClaimed(true);
      showMsg('Nyeremény sikeresen kivéve!', 'success');
    } catch (e) {
      if (e.message.includes('Already claimed')) { setClaimed(true); showMsg('Már korábban kivetted.', 'info'); }
      else showMsg('Hiba: ' + e.message, 'error');
    }
  };

  const handleResolve = async (w) => {
    try {
      await resolve(id, w);
      showMsg(`Piac feloldva: ${w ? '↑ FEL' : '↓ LE'}`, 'success');
    } catch (e) {
      showMsg('Hiba: ' + e.message, 'error');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">

      {/* Visszagomb */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 mb-4 transition-colors">
        ← Vissza a piacokhoz
      </Link>

      {/* Cím sor */}
      <div className="flex items-start gap-3 mb-5">
        {meta && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 mt-0.5"
            style={{ background: color + '20', color }}>
            {meta.icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-semibold text-white">
              {displayPrice
                ? <>{crypto} <span className="mono" style={{ color }}>${displayPrice}</span></>
                : market.question
              }
            </h1>
            {isResolved && (
              <span className={market.winningOutcome ? 'tag-up' : 'tag-down'} style={{ fontSize: 13 }}>
                {market.winningOutcome ? '↑ FEL nyert' : '↓ LE nyert'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Piac #{id} · Lejárat: {new Date(market.endTime * 1000).toLocaleString('hu-HU')}
            {meta && ` · ${meta.label}`}
          </p>
        </div>
      </div>

      {/* Grafikon */}
      {crypto && <CryptoChart symbol={crypto} />}

      {/* Stat sor */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatBox label="↑ FEL tét" value={`${market.totalYesAmount} ETH`} color="#4ade80"
          sub={hasYes ? `Saját: ${userBets.yes} ETH` : null} />
        <StatBox label="↓ LE tét" value={`${market.totalNoAmount} ETH`} color="#f87171"
          sub={hasNo ? `Saját: ${userBets.no} ETH` : null} />
        <StatBox label="Össz volumen" value={`${total.toFixed(4)} ETH`} color="#94a3b8" />
      </div>

      {/* Arány sáv */}
      <div className="card px-4 py-3 mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>↑ FEL {yesP.toFixed(1)}%</span>
          <span>↓ LE {(100 - yesP).toFixed(1)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${yesP}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, #22c55e, ${color})` }}
          />
        </div>
      </div>

      {/* Fogadási panel */}
      <div className="card p-5 mb-4">

        {/* Üzenet sáv */}
        {msg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 px-4 py-2.5 rounded-lg text-sm font-medium"
            style={{
              background: msg.type === 'success' ? 'rgba(34,197,94,0.12)'
                : msg.type === 'error' ? 'rgba(239,68,68,0.12)'
                : 'rgba(148,163,184,0.1)',
              color: msg.type === 'success' ? '#4ade80'
                : msg.type === 'error' ? '#f87171' : '#94a3b8',
              border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.2)' : msg.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(148,163,184,0.1)'}`,
            }}
          >
            {msg.text}
          </motion.div>
        )}

        {!isResolved && !isEnded && address && (
          <>
            <p className="label mb-3">Fogadás leadása</p>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setOutcome(true)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-150"
                style={{
                  background: outcome ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${outcome ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.07)'}`,
                  color: outcome ? '#4ade80' : '#475569',
                }}
              >
                ↑ FEL
              </button>
              <button onClick={() => setOutcome(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-150"
                style={{
                  background: !outcome ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${!outcome ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)'}`,
                  color: !outcome ? '#f87171' : '#475569',
                }}
              >
                ↓ LE
              </button>
            </div>

            <div className="relative mb-3">
              <input type="number" step="0.01" min="0.01" value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full mono text-sm rounded-xl py-3 px-4 pr-14 text-white transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = color + '66'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">ETH</span>
            </div>

            <button onClick={handleBet} disabled={betLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-40"
              style={{
                background: outcome ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                border: `1px solid ${outcome ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: outcome ? '#4ade80' : '#f87171',
              }}
            >
              {betLoading ? 'Tranzakció...' : `Fogadás ${outcome ? '↑ FEL' : '↓ LE'} – ${amount} ETH`}
            </button>
          </>
        )}

        {!address && (
          <div className="text-center py-4">
            <p className="text-sm text-slate-400 mb-3">Csatlakoztasd a tárcádat a fogadáshoz</p>
          </div>
        )}

        {isEnded && !isResolved && (
          <div className="text-center py-4">
            <p className="text-xs text-yellow-500 bg-yellow-900/20 px-4 py-2 rounded-lg inline-block">
              A piac lejárt – az oracle feloldja
            </p>
          </div>
        )}

        {isResolved && canClaim && (
          <button onClick={handleClaim} disabled={claimLoading}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-40"
            style={{
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.3)',
              color: '#a5b4fc',
            }}
          >
            {claimLoading ? 'Folyamatban...' : '🏆 Nyeremény kivétele'}
          </button>
        )}

        {claimed && (
          <p className="text-center text-sm text-green-400 py-2">✓ Nyeremény sikeresen kivéve</p>
        )}

        {isResolved && hasBet && !canClaim && !claimed && (
          <p className="text-center text-xs text-slate-500 py-2">
            Nem a nyertes oldalra fogadtál.
          </p>
        )}

        {isResolved && !hasBet && (
          <p className="text-center text-xs text-slate-500 py-2">
            Nem vettél részt ezen a piacon.
          </p>
        )}
      </div>

      {/* Owner feloldás */}
      {isOwner && !isResolved && isEnded && (
        <div className="card p-4">
          <p className="label mb-3">Kézi feloldás (owner)</p>
          <div className="flex gap-3">
            <button onClick={() => handleResolve(true)} disabled={resolveLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.25)',
                color: '#4ade80',
              }}
            >
              ↑ FEL nyert
            </button>
            <button onClick={() => handleResolve(false)} disabled={resolveLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#f87171',
              }}
            >
              ↓ LE nyert
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
