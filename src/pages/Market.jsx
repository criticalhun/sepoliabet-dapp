import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMarket } from '../hooks/useMarket';
import { usePlaceBet, useClaim, useResolveMarket } from '../hooks/useBetting';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { getOwner, getUserBets } from '../services/contractService';
import { useToast } from '../context/ToastContext';
import CryptoChart from '../components/CryptoChart';
import Spinner from '../components/Spinner';

const CRYPTO_META = {
  BTC: { color: '#f7931a', label: 'Bitcoin',  icon: '₿' },
  ETH: { color: '#627eea', label: 'Ethereum', icon: 'Ξ' },
  SOL: { color: '#9945ff', label: 'Solana',   icon: '◎' },
  BNB: { color: '#f3ba2f', label: 'BNB',      icon: 'B' },
};

function detectCrypto(q = '') {
  for (const k of Object.keys(CRYPTO_META)) if (q.startsWith(k)) return k;
  return null;
}

const QUICK_AMOUNTS = ['0.01', '0.05', '0.1', '0.5'];
const PLATFORM_FEE = 0.02; // 2%

function Countdown({ endTime }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const update = () => setLeft(Math.max(0, endTime - Math.floor(Date.now() / 1000)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const expired = left === 0;

  return (
    <div className="flex items-center gap-1">
      {expired ? (
        <span className="text-yellow-500 text-xs font-medium">Lejárt</span>
      ) : (
        <div className="flex items-center gap-1 mono text-sm">
          {h > 0 && <><span className="text-white font-semibold">{h}</span><span className="text-slate-500">ó</span></>}
          <span className="text-white font-semibold">{String(m).padStart(2,'0')}</span>
          <span className="text-slate-500">p</span>
          <span className="text-white font-semibold">{String(s).padStart(2,'0')}</span>
          <span className="text-slate-500">s</span>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, sub, color }) {
  return (
    <div className="card px-4 py-3">
      <p className="label mb-1">{label}</p>
      <p className="mono text-sm font-semibold" style={{ color: color || '#e2e8f0' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{sub}</p>}
    </div>
  );
}

export default function Market() {
  const { id } = useParams();
  const market = useMarket(id);
  const { address } = useAccount();
  const toast = useToast();
  const { bet, isLoading: betLoading } = usePlaceBet();
  const { claim, isLoading: claimLoading } = useClaim();
  const { resolve, isLoading: resolveLoading } = useResolveMarket();

  const [amount, setAmount] = useState('0.05');
  const [outcome, setOutcome] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [userBets, setUserBets] = useState({ yes: '0', no: '0' });
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!address) return;
    getOwner().then(o => setIsOwner(o.toLowerCase() === address.toLowerCase())).catch(() => {});
  }, [address]);

  useEffect(() => {
    if (!address || !id || !market) return;
    getUserBets(id, address).then(setUserBets).catch(() => {});
  }, [id, address, market]);

  // Live expected payout
  const payout = useMemo(() => {
    if (!market) return null;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return null;
    const newYes = parseFloat(market.totalYesAmount) + (outcome ? amt : 0);
    const newNo  = parseFloat(market.totalNoAmount)  + (outcome ? 0 : amt);
    const newTotal = newYes + newNo;
    const winPool = outcome ? newYes : newNo;
    if (winPool === 0) return null;
    const gross = amt * newTotal / winPool;
    const fee   = gross * PLATFORM_FEE;
    const net   = gross - fee;
    return { gross, fee, net, multi: net / amt };
  }, [market, amount, outcome]);

  if (!market) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  );

  const crypto = detectCrypto(market.question);
  const meta   = crypto ? CRYPTO_META[crypto] : null;
  const color  = meta?.color || '#6366f1';
  const isEnded    = Date.now() / 1000 > market.endTime;
  const isResolved = market.resolved;

  const hasYes  = parseFloat(userBets.yes) > 0;
  const hasNo   = parseFloat(userBets.no)  > 0;
  const hasBet  = hasYes || hasNo;
  const canClaim = isResolved && !claimed && (
    (market.winningOutcome && hasYes) || (!market.winningOutcome && hasNo)
  );

  const total = parseFloat(market.totalYesAmount) + parseFloat(market.totalNoAmount);
  const yesP  = total > 0 ? parseFloat(market.totalYesAmount) / total * 100 : 50;
  const priceMatch = market.question.match(/([\d,]+\.?\d{0,2}) USD/);
  const displayPrice = priceMatch ? priceMatch[1] : null;

  const handleBet = async () => {
    try {
      await bet(id, outcome, amount);
      toast(`Fogadás sikeres! ${amount} ETH → ${outcome ? '↑ FEL' : '↓ LE'}`, 'success');
      getUserBets(id, address).then(setUserBets).catch(() => {});
    } catch (e) {
      toast(e.message.includes('rejected') ? 'Tranzakció elutasítva.' : 'Hiba: ' + e.message.slice(0, 60), 'error');
    }
  };

  const handleClaim = async () => {
    try {
      await claim(id);
      setClaimed(true);
      toast('Nyeremény sikeresen kivéve! 🏆', 'success');
    } catch (e) {
      if (e.message.includes('Already claimed')) { setClaimed(true); toast('Már kivettél.', 'info'); }
      else toast('Hiba: ' + e.message.slice(0, 60), 'error');
    }
  };

  const handleResolve = async (w) => {
    try {
      await resolve(id, w);
      toast(`Piac feloldva: ${w ? '↑ FEL' : '↓ LE'}`, 'success');
    } catch (e) {
      toast('Hiba: ' + e.message.slice(0, 60), 'error');
    }
  };

  return (
    <div className="container mx-auto px-4 py-5 max-w-6xl">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
        <Link to="/" className="hover:text-slate-300 transition-colors">Piacok</Link>
        <span>/</span>
        {meta && <span style={{ color }}>{meta.label}</span>}
        <span>/</span>
        <span className="text-slate-400">#{id}</span>
      </div>

      {/* Cím */}
      <div className="flex items-center gap-3 mb-5">
        {meta && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold shrink-0"
            style={{ background: color + '18', color }}>
            {meta.icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-white">
              {displayPrice
                ? <>{crypto} <span className="mono" style={{ color }}>${displayPrice}</span></>
                : <span className="truncate">{market.question}</span>
              }
            </h1>
            {isResolved && (
              <span className={market.winningOutcome ? 'tag-up' : 'tag-down'} style={{ fontSize: 12 }}>
                {market.winningOutcome ? '↑ FEL nyert' : '↓ LE nyert'}
              </span>
            )}
            {!isResolved && !isEnded && (
              <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Aktív
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
            <span>Piac #{id}</span>
            <span>·</span>
            <Countdown endTime={market.endTime} />
            <span>·</span>
            <span>2% díj</span>
          </div>
        </div>
      </div>

      {/* Fő tartalom – 2 hasáb */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bal: Grafikon + statisztikák */}
        <div className="lg:col-span-2 space-y-4">
          {crypto && <CryptoChart symbol={crypto} />}

          {/* Stat sor */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="↑ FEL tét"    value={`${market.totalYesAmount} ETH`} color="#4ade80"
              sub={hasYes ? `Saját: ${parseFloat(userBets.yes).toFixed(4)} ETH` : undefined} />
            <StatBox label="↓ LE tét"     value={`${market.totalNoAmount} ETH`}  color="#f87171"
              sub={hasNo  ? `Saját: ${parseFloat(userBets.no).toFixed(4)} ETH`  : undefined} />
            <StatBox label="Teljes pool"   value={`${total.toFixed(4)} ETH`}      color="#94a3b8" />
            <StatBox label="Platform díj" value="2%"                              color="#fbbf24"
              sub="Nyereményből" />
          </div>

          {/* Arány sáv */}
          <div className="card px-4 py-3">
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span style={{ color: '#4ade80' }}>↑ FEL {yesP.toFixed(1)}%</span>
              <span style={{ color: '#f87171' }}>↓ LE {(100-yesP).toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${yesP}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: isResolved
                  ? (market.winningOutcome ? '#22c55e' : '#ef4444')
                  : `linear-gradient(90deg, #22c55e, ${color})` }}
              />
            </div>
          </div>
        </div>

        {/* Jobb: Fogadási panel – sticky */}
        <div className="lg:sticky lg:top-20 lg:self-start space-y-3">

          {/* Állapot badge */}
          {isResolved && (
            <div className={`px-4 py-3 rounded-xl text-center font-semibold ${
              market.winningOutcome
                ? 'bg-green-900/30 border border-green-700/30 text-green-400'
                : 'bg-red-900/30 border border-red-700/30 text-red-400'
            }`}>
              Eredmény: {market.winningOutcome ? '↑ FEL nyert' : '↓ LE nyert'}
            </div>
          )}

          {/* Fogadási form */}
          {!isResolved && !isEnded && address && (
            <div className="card-elevated p-5 space-y-4">
              <p className="label">Fogadás leadása</p>

              {/* FEL / LE választó */}
              <div className="grid grid-cols-2 gap-2">
                {[true, false].map(side => (
                  <button key={String(side)} onClick={() => setOutcome(side)}
                    className="py-3 rounded-xl text-sm font-bold transition-all duration-150"
                    style={{
                      background: outcome === side
                        ? (side ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)')
                        : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${outcome === side
                        ? (side ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)')
                        : 'rgba(255,255,255,0.07)'}`,
                      color: outcome === side
                        ? (side ? '#4ade80' : '#f87171')
                        : '#475569',
                    }}
                  >
                    {side ? '↑ FEL' : '↓ LE'}
                  </button>
                ))}
              </div>

              {/* Quick amount gombok */}
              <div>
                <p className="label mb-1.5">Összeg</p>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {QUICK_AMOUNTS.map(a => (
                    <button key={a} onClick={() => setAmount(a)}
                      className="py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: amount === a ? `${color}22` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${amount === a ? color + '55' : 'rgba(255,255,255,0.07)'}`,
                        color: amount === a ? color : '#64748b',
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input type="number" step="0.01" min="0.001" value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full mono text-sm rounded-xl py-2.5 px-3 pr-12"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#e2e8f0', outline: 'none',
                    }}
                    onFocus={e => e.target.style.borderColor = color + '66'}
                    onBlur={e => e.target.style.borderColor  = 'rgba(255,255,255,0.1)'}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium mono">ETH</span>
                </div>
              </div>

              {/* Expected payout */}
              <AnimatePresence>
                {payout && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Bruttó kifizetés</span>
                        <span className="mono text-slate-300">{payout.gross.toFixed(5)} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Platform díj (2%)</span>
                        <span className="mono text-yellow-500">−{payout.fee.toFixed(5)} ETH</span>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 6, paddingTop: 6 }}
                        className="flex justify-between">
                        <span className="text-slate-300 font-medium">Nettó nyeremény</span>
                        <span className="mono font-semibold" style={{ color: payout.multi >= 1.5 ? '#4ade80' : '#e2e8f0' }}>
                          {payout.net.toFixed(5)} ETH
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Szorzó</span>
                        <span className="mono font-bold" style={{ color }}>
                          {payout.multi.toFixed(2)}×
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bet gomb */}
              <button onClick={handleBet} disabled={betLoading || !amount || parseFloat(amount) <= 0}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-150 disabled:opacity-40"
                style={{
                  background: outcome ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)',
                  border: `1px solid ${outcome ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                  color: outcome ? '#4ade80' : '#f87171',
                }}
              >
                {betLoading
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      Tranzakció...
                    </span>
                  : `Fogadás ${outcome ? '↑ FEL' : '↓ LE'} — ${amount} ETH`
                }
              </button>

              <p className="text-center text-xs text-slate-600">
                A platformdíj a nyereményből kerül levonásra
              </p>
            </div>
          )}

          {/* Nem bejelentkezett */}
          {!address && (
            <div className="card p-5 text-center">
              <p className="text-sm text-slate-400 mb-1">Csatlakoztasd a tárcádat</p>
              <p className="text-xs text-slate-600">a fogadás indításához</p>
            </div>
          )}

          {/* Lejárt, nem feloldott */}
          {isEnded && !isResolved && (
            <div className="card px-4 py-3 text-center">
              <p className="text-xs" style={{ color: '#fbbf24' }}>
                A piac lejárt – oracle feldolgozás alatt
              </p>
            </div>
          )}

          {/* Nyeremény kivétel */}
          {canClaim && (
            <button onClick={handleClaim} disabled={claimLoading}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
              style={{
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.35)',
                color: '#a5b4fc',
              }}
            >
              {claimLoading ? 'Folyamatban...' : '🏆 Nyeremény kivétele'}
            </button>
          )}

          {claimed && (
            <div className="card px-4 py-3 text-center text-sm" style={{ color: '#4ade80' }}>
              ✓ Nyeremény sikeresen kivéve
            </div>
          )}

          {isResolved && hasBet && !canClaim && !claimed && (
            <div className="card px-4 py-3 text-center text-xs text-slate-500">
              Nem a nyertes oldalra fogadtál.
            </div>
          )}

          {isResolved && !hasBet && (
            <div className="card px-4 py-3 text-center text-xs text-slate-500">
              Nem vettél részt ezen a piacon.
            </div>
          )}

          {/* Owner feloldás */}
          {isOwner && !isResolved && isEnded && (
            <div className="card p-4 space-y-2">
              <p className="label mb-2">Kézi feloldás (owner)</p>
              <div className="grid grid-cols-2 gap-2">
                {[true, false].map(w => (
                  <button key={String(w)} onClick={() => handleResolve(w)} disabled={resolveLoading}
                    className="py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                    style={{
                      background: w ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${w ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                      color: w ? '#4ade80' : '#f87171',
                    }}
                  >
                    {w ? '↑ FEL nyert' : '↓ LE nyert'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
