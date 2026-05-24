import { useState, useEffect, useMemo } from 'react';
import { useMarkets } from '../hooks/useMarket';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { CONTRACT_ADDRESS } from '../contracts/contractAddress';
import BettingMarketABI from '../contracts/BettingMarket.json';
import Spinner from '../components/Spinner';
import StatsPanel from '../components/StatsPanel';

const CRYPTO_META = {
  BTC: { color: '#f7931a', icon: '₿' },
  ETH: { color: '#627eea', icon: 'Ξ' },
  SOL: { color: '#9945ff', icon: '◎' },
  BNB: { color: '#f3ba2f', icon: 'B' },
};

function detectCrypto(q = '') {
  for (const k of Object.keys(CRYPTO_META)) if (q.startsWith(k)) return k;
  return null;
}

function useNow() {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function TimeLeft({ endTime, now }) {
  const left = Math.max(0, endTime - now);
  if (left === 0) return <span className="text-yellow-500 text-xs">Lejárt</span>;
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const urgent = left < 300; // 5 perc alatt piros
  return (
    <span className="mono text-xs font-medium" style={{ color: urgent ? '#f87171' : '#64748b' }}>
      {h > 0 ? `${h}ó ${String(m).padStart(2,'0')}p` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
    </span>
  );
}

function MarketCard({ market, index, now }) {
  const crypto = detectCrypto(market.question);
  const meta = crypto ? CRYPTO_META[crypto] : null;
  const color = meta?.color || '#475569';
  const total = parseFloat(market.totalYesAmount) + parseFloat(market.totalNoAmount);
  const yesP = total > 0 ? parseFloat(market.totalYesAmount) / total * 100 : 50;
  const priceMatch = market.question.match(/([\d,]+\.?\d{0,2}) USD/);
  const price = priceMatch ? priceMatch[1] : null;
  const isResolved = market.resolved;
  const isEnded = now > market.endTime;
  const isUrgent = !isResolved && !isEnded && (market.endTime - now) < 300;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.03 }}
      whileHover={{ y: -3 }}
      className="card overflow-hidden group cursor-pointer"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <Link to={`/market/${market.id}`} className="block p-4">
        {/* Fejléc */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {meta && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: color + '18', color }}>
                {meta.icon}
              </div>
            )}
            <div className="min-w-0">
              <p className="label">{crypto || 'Piac'} #{market.id}</p>
              {price
                ? <p className="mono text-white text-sm font-semibold">${price}</p>
                : <p className="text-slate-300 text-sm truncate">{market.question}</p>
              }
            </div>
          </div>

          <div className="shrink-0 ml-2 text-right">
            {isResolved ? (
              <span className={market.winningOutcome ? 'tag-up' : 'tag-down'}>
                {market.winningOutcome ? '↑' : '↓'}
              </span>
            ) : (
              <TimeLeft endTime={market.endTime} now={now} />
            )}
          </div>
        </div>

        {/* Pool + ratio */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600 mono">{total.toFixed(4)} ETH pool</span>
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: '#4ade80' }}>↑ {yesP.toFixed(0)}%</span>
              <span style={{ color: '#f87171' }}>↓ {(100-yesP).toFixed(0)}%</span>
            </div>
          </div>

          <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${yesP}%` }}
              transition={{ duration: 0.6, delay: index * 0.03 + 0.15 }}
              className="h-full rounded-full"
              style={{
                background: isResolved
                  ? (market.winningOutcome ? '#22c55e' : '#ef4444')
                  : `linear-gradient(90deg, #22c55e, ${color})`,
              }}
            />
          </div>
        </div>

        {/* Sürgős jelzés */}
        {isUrgent && (
          <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: '#f87171' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Hamarosan lejár
          </div>
        )}
      </Link>
    </motion.div>
  );
}

const CRYPTOS = ['Mind', 'BTC', 'ETH', 'SOL', 'BNB'];
const SORT_OPTIONS = [
  { key: 'newest',  label: 'Legújabb'  },
  { key: 'ending',  label: 'Lejáró'    },
  { key: 'volume',  label: 'Volumen'   },
];
const TABS = [
  { key: 'active',   label: 'Aktív'       },
  { key: 'results',  label: 'Eredmények'  },
  { key: 'mine',     label: 'Saját'       },
];

export default function Home() {
  const { markets, loading } = useMarkets();
  const { address } = useAccount();
  const now = useNow();
  const [cryptoFilter, setCryptoFilter] = useState('Mind');
  const [tab, setTab]   = useState('active');
  const [sort, setSort] = useState('ending');
  const [myMarkets, setMyMarkets] = useState([]);

  useEffect(() => {
    if (!address || !markets.length) { setMyMarkets([]); return; }
    (async () => {
      const provider  = new ethers.BrowserProvider(window.ethereum);
      const contract  = new ethers.Contract(CONTRACT_ADDRESS, BettingMarketABI, provider);
      const result = [];
      for (const m of markets) {
        const [y, n] = await Promise.all([
          contract.getUserBet(m.id, address, true),
          contract.getUserBet(m.id, address, false),
        ]);
        if (y > 0n || n > 0n) result.push(m);
      }
      setMyMarkets(result);
    })();
  }, [markets, address]);

  const filtered = useMemo(() => {
    const base = {
      active:  markets.filter(m => !m.resolved),
      results: markets.filter(m =>  m.resolved),
      mine:    myMarkets,
    }[tab] || [];

    const byCrypto = cryptoFilter === 'Mind' ? base
      : base.filter(m => detectCrypto(m.question) === cryptoFilter);

    return [...byCrypto].sort((a, b) => {
      if (sort === 'newest') return b.id - a.id;
      if (sort === 'ending') return a.endTime - b.endTime;
      if (sort === 'volume') {
        const va = parseFloat(a.totalYesAmount) + parseFloat(a.totalNoAmount);
        const vb = parseFloat(b.totalYesAmount) + parseFloat(b.totalNoAmount);
        return vb - va;
      }
      return 0;
    });
  }, [markets, myMarkets, tab, cryptoFilter, sort]);

  const counts = {
    active:  markets.filter(m => !m.resolved).length,
    results: markets.filter(m =>  m.resolved).length,
    mine:    myMarkets.length,
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">

      {/* Hero */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1">Kripto előrejelzési piacok</h1>
        <p className="text-sm text-slate-500">
          BTC · ETH · SOL · BNB · Valós idejű · 2% platform díj
        </p>
      </div>

      <StatsPanel />

      {/* Filter sor */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">

        {/* Kripto filter */}
        <div className="flex items-center gap-1 p-1 rounded-lg overflow-x-auto"
          style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.06)' }}>
          {CRYPTOS.map(c => {
            const meta = CRYPTO_META[c];
            const active = cryptoFilter === c;
            return (
              <button key={c} onClick={() => setCryptoFilter(c)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-120 shrink-0"
                style={{
                  background: active ? (meta?.color + '22' || 'rgba(99,102,241,0.15)') : 'transparent',
                  color: active ? (meta?.color || '#a5b4fc') : '#475569',
                  border: active ? `1px solid ${meta?.color || '#6366f1'}44` : '1px solid transparent',
                }}>
                {c}
              </button>
            );
          })}
        </div>

        {/* Tab + Sort */}
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg"
            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.06)' }}>
            {TABS.filter(t => t.key !== 'mine' || address).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-120"
                style={{
                  background: tab === t.key ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: tab === t.key ? '#e2e8f0' : '#475569',
                }}>
                {t.label}
                <span className="ml-1 text-slate-600">{counts[t.key] ?? 0}</span>
              </button>
            ))}
          </div>

          {/* Sort */}
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="text-xs rounded-lg px-2 py-1.5 mono"
            style={{
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#94a3b8',
              outline: 'none',
            }}>
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Piac grid */}
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-600">
          <div className="text-5xl mb-3 opacity-30">◎</div>
          <p className="text-sm">Nincs megjeleníthető piac</p>
          {cryptoFilter !== 'Mind' && (
            <button onClick={() => setCryptoFilter('Mind')}
              className="mt-3 text-xs text-indigo-400 hover:text-indigo-300">
              Összes megjelenítése →
            </button>
          )}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <div key={tab + cryptoFilter + sort}
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((m, i) => (
              <MarketCard key={m.id} market={m} index={i} now={now} />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
