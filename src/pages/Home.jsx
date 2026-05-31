import { useState, useEffect, useMemo } from 'react';
import { useMarkets } from '../hooks/useMarket';
import { useStats } from '../hooks/useStats';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { getUserBet } from '../services/contractService';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useCountdown, fmtCountdown } from '../hooks/useCountdown';
import Spinner from '../components/Spinner';

const COIN_COLORS = { BTC:'#f7931a', ETH:'#627eea', SOL:'#9945ff', BNB:'#f3ba2f' };
const SORTS = ['sort_newest','sort_ending','sort_volume'];

// ── Animated counter ────────────────────────────────────────
function Counter({ value, decimals = 0, suffix = '' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end   = parseFloat(value);
    const dur   = 1200;
    const step  = 16;
    const steps = dur / step;
    const inc   = end / steps;
    const id = setInterval(() => {
      start += inc;
      if (start >= end) { setDisplay(end); clearInterval(id); }
      else setDisplay(start);
    }, step);
    return () => clearInterval(id);
  }, [value]);
  return <>{display.toFixed(decimals)}{suffix}</>;
}

// ── Hero ─────────────────────────────────────────────────────
function HeroSection() {
  const { t } = useTranslation();
  const { totalVolume, active, total, tvl, loading } = useStats();
  const [btc, setBtc] = useState(null);

  useEffect(() => {
    fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT')
      .then(r => r.json())
      .then(d => setBtc({ price: parseFloat(d.lastPrice), change: parseFloat(d.priceChangePercent) }))
      .catch(() => {});
  }, []);

  return (
    <div className="relative py-14 md:py-20 text-center mb-8 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 65%)'
        }} />
      </div>

      {/* Badge */}
      <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
        style={{ background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)', color:'#818cf8' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
        Sepolia Testnet
      </motion.div>

      {/* Tagline */}
      <motion.h1
        initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:0.05 }}
        className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 leading-tight"
      >
        <span className="gradient-text">Predict.</span>{' '}
        <span className="gradient-text">Bet.</span>{' '}
        <span className="gradient-text">Win.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity:0 }} animate={{ opacity:1 }}
        transition={{ delay:0.15 }}
        className="text-base md:text-lg max-w-xl mx-auto mb-8"
        style={{ color:'var(--text-2)' }}
      >
        {t('home.hero_sub')}
      </motion.p>

      {/* Live BTC price pill */}
      {btc && (
        <motion.div
          initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
          transition={{ delay:0.2 }}
          className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl mb-10 glass"
        >
          <span className="font-bold text-sm" style={{ color:'#f7931a' }}>₿ BTC</span>
          <span className="text-xl font-bold font-mono" style={{ color:'var(--text-1)' }}>
            ${btc.price.toLocaleString('en-US', { maximumFractionDigits:2 })}
          </span>
          <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
            btc.change >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
            {btc.change >= 0 ? '+':''}{btc.change.toFixed(2)}%
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </motion.div>
      )}

      {/* Stats row */}
      {!loading && (
        <motion.div
          initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.3 }}
          className="inline-grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden glass max-w-2xl mx-auto"
        >
          {[
            { label: t('stats.volume'),  val: <><Counter value={totalVolume} decimals={2}/> ETH</> },
            { label: t('stats.active'),  val: <Counter value={active} /> },
            { label: t('stats.total'),   val: <Counter value={total} /> },
            { label: t('stats.tvl'),     val: <><Counter value={tvl} decimals={4}/> ETH</> },
          ].map(s => (
            <div key={s.label} className="px-5 py-4 text-center"
              style={{ background:'var(--card-bg)' }}>
              <p className="text-xl md:text-2xl font-bold font-mono gradient-text">{s.val}</p>
              <p className="text-xs mt-1" style={{ color:'var(--text-3)' }}>{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ── Market card ───────────────────────────────────────────────
function MarketCard({ market, index }) {
  const { t } = useTranslation();
  const secs = useCountdown(market.endTime);
  const cd   = fmtCountdown(secs);
  const urgent  = secs > 0 && secs < 300;
  const expired = secs === 0 && !market.resolved;

  const total = parseFloat(market.totalYesAmount) + parseFloat(market.totalNoAmount);
  const yPct  = total > 0 ? (parseFloat(market.totalYesAmount)/total*100) : 50;
  const nPct  = 100 - yPct;

  // Detect crypto symbol
  const symMatch = market.question.match(/^(BTC|ETH|SOL|BNB)/);
  const sym   = symMatch?.[1];
  const color = sym ? COIN_COLORS[sym] : '#818cf8';

  // Clean title
  const priceMatch = market.question.match(/(\w+)\s*árfolyam:\s*([\d.]+)\s*USD/);
  const title = priceMatch
    ? `${priceMatch[1]} $${priceMatch[2]}`
    : market.question.length > 55
    ? market.question.slice(0,53) + '…'
    : market.question;

  return (
    <motion.div
      initial={{ opacity:0, y:14 }}
      animate={{ opacity:1, y:0 }}
      transition={{ duration:0.2, delay: Math.min(index,8)*0.04 }}
      whileHover={{ y:-4, boxShadow:`0 12px 32px ${color}22` }}
      className="glass-card overflow-hidden cursor-pointer transition-shadow duration-300"
      style={{ borderLeft:`3px solid ${color}` }}
    >
      <Link to={`/market/${market.id}`} className="block p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-sm font-semibold leading-snug flex-1" style={{ color:'var(--text-1)' }}>
            {title}
          </p>
          {sym && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background:`${color}18`, color }}>
              {sym}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {!market.resolved ? (
          <>
            <div className="h-1.5 rounded-full overflow-hidden mb-2"
              style={{ background:'rgba(239,68,68,0.2)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width:0 }}
                animate={{ width:`${yPct}%` }}
                transition={{ duration:0.8, ease:'easeOut' }}
                style={{ background:`linear-gradient(90deg, #22c55e, #16a34a)` }}
              />
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-emerald-400">
                {t('home.up')} {yPct.toFixed(0)}%
              </span>
              <span className="text-xs font-semibold text-rose-400">
                {t('home.down')} {nPct.toFixed(0)}%
              </span>
            </div>
          </>
        ) : (
          <div className={`text-xs font-bold py-1.5 text-center rounded-lg mb-3 ${
            market.winningOutcome
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-rose-500/10 text-rose-400'
          }`}>
            {t('home.result')}: {market.winningOutcome ? t('home.up') : t('home.down')}
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono font-semibold" style={{ color:'var(--text-3)' }}>
            {total.toFixed(4)} ETH
          </span>
          {market.resolved ? (
            <span style={{ color:'var(--text-3)' }}>Lezárva</span>
          ) : expired ? (
            <span className="text-orange-400 font-semibold">Feloldásra vár</span>
          ) : (
            <span className={`font-mono font-bold tabular-nums ${
              urgent ? 'text-orange-400' : 'text-brand-400'
            }`}>
              {urgent && <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping mr-1 align-middle" />}
              {cd}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// ── Home page ─────────────────────────────────────────────────
export default function Home() {
  const { t } = useTranslation();
  const { markets, loading } = useMarkets();
  const { address } = useAccount();
  const [tab,       setTab]       = useState('active');
  const [sort,      setSort]      = useState('sort_newest');
  const [myMarkets, setMyMarkets] = useState([]);
  const [myLoading, setMyLoading] = useState(false);

  useEffect(() => {
    if (!address || !markets.length) { setMyMarkets([]); return; }
    let cancelled = false;
    setMyLoading(true);
    (async () => {
      const res = [];
      for (const m of markets) {
        try {
          const [y, n] = await Promise.all([
            getUserBet(m.id, address, true),
            getUserBet(m.id, address, false),
          ]);
          if (parseFloat(y) > 0 || parseFloat(n) > 0) res.push(m);
        } catch {}
      }
      if (!cancelled) { setMyMarkets(res); setMyLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [markets, address]);

  const active   = markets.filter(m => !m.resolved);
  const resolved = markets.filter(m => m.resolved);

  const sorted = useMemo(() => {
    const list = tab==='active' ? active : tab==='results' ? resolved : myMarkets;
    if (sort==='sort_ending') return [...list].sort((a,b) => a.endTime - b.endTime);
    if (sort==='sort_volume') return [...list].sort((a,b) =>
      (parseFloat(b.totalYesAmount)+parseFloat(b.totalNoAmount)) -
      (parseFloat(a.totalYesAmount)+parseFloat(a.totalNoAmount)));
    return list;
  }, [tab, sort, active, resolved, myMarkets]);

  const isLoading = loading || (tab==='mybets' && myLoading);

  return (
    <div>
      <HeroSection />

      {/* Tabs + sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex gap-1 p-1 rounded-xl"
          style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)' }}>
          {[
            { key:'active',  cnt: active.length },
            { key:'results', cnt: resolved.length },
            ...(address ? [{ key:'mybets', cnt: myMarkets.length }] : []),
          ].map(({ key, cnt }) => (
            <button key={key} onClick={() => setTab(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab===key ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: tab===key ? '#818cf8' : 'var(--text-2)',
              }}>
              {t(`home.tab_${key}`)} ({cnt})
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {SORTS.map(s => (
            <button key={s} onClick={() => setSort(s)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: sort===s ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: sort===s ? '#818cf8' : 'var(--text-3)',
                border: sort===s ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
              }}>
              {t(`home.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <Spinner key="spin" />
        ) : sorted.length === 0 ? (
          <motion.p key="empty"
            initial={{ opacity:0 }} animate={{ opacity:1 }}
            className="text-center py-20 text-sm"
            style={{ color:'var(--text-3)' }}>
            {t(`home.no_${tab === 'active' ? 'active' : tab === 'results' ? 'resolved' : 'mybets'}`)}
          </motion.p>
        ) : (
          <motion.div key="grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20 md:pb-0">
            {sorted.map((m, i) => <MarketCard key={m.id} market={m} index={i} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
