import { useState, useEffect } from 'react';
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

function TimeLeft({ endTime }) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    const update = () => {
      const s = endTime - Math.floor(Date.now() / 1000);
      if (s <= 0) { setLeft('Lejárt'); return; }
      if (s < 3600) setLeft(`${Math.floor(s/60)}p ${s%60}s`);
      else setLeft(`${Math.floor(s/3600)}ó ${Math.floor((s%3600)/60)}p`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  return <span className="mono text-xs">{left}</span>;
}

function MarketCard({ market, index }) {
  const crypto = detectCrypto(market.question);
  const meta = crypto ? CRYPTO_META[crypto] : null;
  const total = parseFloat(market.totalYesAmount) + parseFloat(market.totalNoAmount);
  const yesP = total > 0 ? (parseFloat(market.totalYesAmount) / total * 100) : 50;
  const priceMatch = market.question.match(/([\d,]+\.?\d{0,2}) USD/);
  const price = priceMatch ? priceMatch[1] : null;
  const isResolved = market.resolved;
  const isEnded = Date.now() / 1000 > market.endTime;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.035 }}
      whileHover={{ y: -3 }}
      className="card transition-all duration-200 overflow-hidden group"
      style={{
        borderLeft: `3px solid ${meta?.color || '#334155'}`,
        cursor: 'pointer',
      }}
    >
      <Link to={`/market/${market.id}`} className="block p-4">

        {/* Fejléc */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {meta && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: meta.color + '20', color: meta.color }}>
                {meta.icon}
              </div>
            )}
            <div>
              <p className="label">{crypto || 'Egyéb'} piac #{market.id}</p>
              {price && (
                <p className="text-white font-semibold text-sm mono">
                  ${price}
                </p>
              )}
              {!price && (
                <p className="text-slate-300 text-sm leading-snug line-clamp-2">
                  {market.question}
                </p>
              )}
            </div>
          </div>

          {isResolved ? (
            <span className={market.winningOutcome ? 'tag-up' : 'tag-down'}>
              {market.winningOutcome ? '↑ FEL' : '↓ LE'}
            </span>
          ) : isEnded ? (
            <span className="text-xs text-yellow-500 bg-yellow-900/20 px-2 py-0.5 rounded">
              Lejárt
            </span>
          ) : (
            <span className="text-xs text-slate-500">
              <TimeLeft endTime={market.endTime} />
            </span>
          )}
        </div>

        {/* Pool + sáv */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Pool: <span className="text-slate-300 mono">{total.toFixed(4)} ETH</span></span>
            <span className="flex gap-3">
              <span style={{ color: '#4ade80' }}>↑ {yesP.toFixed(0)}%</span>
              <span style={{ color: '#f87171' }}>↓ {(100 - yesP).toFixed(0)}%</span>
            </span>
          </div>

          <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${yesP}%` }}
              transition={{ duration: 0.6, delay: index * 0.035 + 0.2 }}
              className="h-full rounded-full"
              style={{
                background: isResolved
                  ? (market.winningOutcome ? '#22c55e' : '#ef4444')
                  : `linear-gradient(90deg, #22c55e, ${meta?.color || '#6366f1'})`,
              }}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

const CRYPTOS = ['Mind', 'BTC', 'ETH', 'SOL', 'BNB'];
const TABS = [
  { key: 'active', label: 'Aktív' },
  { key: 'results', label: 'Eredmények' },
  { key: 'mine', label: 'Saját' },
];

export default function Home() {
  const { markets, loading } = useMarkets();
  const { address } = useAccount();
  const [crypto, setCrypto] = useState('Mind');
  const [tab, setTab] = useState('active');
  const [myMarkets, setMyMarkets] = useState([]);

  useEffect(() => {
    if (!address || !markets.length) { setMyMarkets([]); return; }
    const check = async () => {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, BettingMarketABI, provider);
      const res = [];
      for (const m of markets) {
        const [y, n] = await Promise.all([
          contract.getUserBet(m.id, address, true),
          contract.getUserBet(m.id, address, false),
        ]);
        if (y > 0n || n > 0n) res.push(m);
      }
      setMyMarkets(res);
    };
    check();
  }, [markets, address]);

  const byCrypto = (list) => crypto === 'Mind' ? list
    : list.filter(m => detectCrypto(m.question) === crypto);

  const lists = {
    active: byCrypto(markets.filter(m => !m.resolved)),
    results: byCrypto(markets.filter(m => m.resolved)),
    mine: byCrypto(myMarkets),
  };
  const display = lists[tab] || [];

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">

      {/* Hero */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1">
          Kripto előrejelzési piacok
        </h1>
        <p className="text-sm text-slate-500">
          Valós idejű BTC · ETH · SOL · BNB árfolyam piacok Sepolia testneten
        </p>
      </div>

      <StatsPanel />

      {/* Kripto + Tab filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        {/* Kripto filter */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.06)' }}>
          {CRYPTOS.map(c => {
            const meta = CRYPTO_META[c];
            const active = crypto === c;
            return (
              <button key={c} onClick={() => setCrypto(c)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
                style={{
                  background: active ? (meta?.color + '22' || 'rgba(99,102,241,0.15)') : 'transparent',
                  color: active ? (meta?.color || '#a5b4fc') : '#475569',
                  border: active ? `1px solid ${meta?.color || '#6366f1'}44` : '1px solid transparent',
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Tab filter */}
        <div className="flex items-center gap-1">
          {TABS.filter(t => t.key !== 'mine' || address).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
              style={{
                background: tab === t.key ? 'rgba(255,255,255,0.07)' : 'transparent',
                color: tab === t.key ? '#e2e8f0' : '#475569',
                border: '1px solid transparent',
              }}
            >
              {t.label}
              <span className="ml-1.5 text-slate-600">
                {lists[t.key]?.length ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? <Spinner /> : display.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600">
          <div className="text-4xl mb-3">◎</div>
          <p className="text-sm">Nincs megjeleníthető piac</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <div key={tab + crypto}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {display.map((m, i) => (
              <MarketCard key={m.id} market={m} index={i} />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
