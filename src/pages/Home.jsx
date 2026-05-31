import { useState, useEffect, useMemo } from 'react';
import { useMarkets } from '../hooks/useMarket';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { getUserBet } from '../services/contractService';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useCountdown, fmtCountdown } from '../hooks/useCountdown';
import GlassCard from '../components/GlassCard';
import Spinner from '../components/Spinner';

const SORTS = ['sort_newest', 'sort_ending', 'sort_volume'];

export default function Home() {
  const { t } = useTranslation();
  const { markets, loading } = useMarkets();
  const { address } = useAccount();
  const [tab, setTab] = useState('active');
  const [sort, setSort] = useState('sort_newest');
  const [myMarkets, setMyMarkets] = useState([]);
  const [myLoading, setMyLoading] = useState(false);

  // My Bets – tab váltáskor és markets változásakor is frissül
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
        } catch (e) {
          console.warn('getUserBet hiba:', m.id, e.message);
        }
      }
      if (!cancelled) { setMyMarkets(res); setMyLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [markets, address]);

  const active   = markets.filter(m => !m.resolved);
  const resolved = markets.filter(m => m.resolved);

  const sorted = useMemo(() => {
    const list = tab === 'active' ? active : tab === 'results' ? resolved : myMarkets;
    if (sort === 'sort_ending') return [...list].sort((a,b) => a.endTime - b.endTime);
    if (sort === 'sort_volume') return [...list].sort((a,b) =>
      (parseFloat(b.totalYesAmount)+parseFloat(b.totalNoAmount)) -
      (parseFloat(a.totalYesAmount)+parseFloat(a.totalNoAmount)));
    return list;
  }, [tab, sort, active, resolved, myMarkets]);

  const titleKey = { active:'title_active', results:'title_results', mybets:'title_mybets' }[tab];
  const subKey   = { active:'sub_active',   results:'sub_results',   mybets:'sub_mybets'  }[tab];
  const emptyKey = { active:'no_active',    results:'no_resolved',   mybets:'no_mybets'   }[tab];

  const isLoading = loading || (tab === 'mybets' && myLoading);

  return (
    <div>
      {/* Hero */}
      <div className="mb-5">
        <motion.h1 key={titleKey} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
          className="text-3xl md:text-4xl font-bold gradient-text mb-1">
          {t(`home.${titleKey}`)}
        </motion.h1>
        <p className="text-sm" style={{ color:'var(--text-2)' }}>{t(`home.${subKey}`)}</p>
      </div>

      {/* Tabs + Sort */}
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
      {isLoading ? (
        <Spinner />
      ) : sorted.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color:'var(--text-3)' }}>{t(`home.${emptyKey}`)}</p>
          {tab === 'mybets' && (
            <p className="text-xs mt-2" style={{ color:'var(--text-3)' }}>
              Nyiss meg egy piacot és fogadj!
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map((m, i) => <MarketCard key={m.id} market={m} index={i} />)}
        </div>
      )}
    </div>
  );
}

function MarketCard({ market, index }) {
  const { t } = useTranslation();
  const secs  = useCountdown(market.endTime);              // ← élő visszaszámláló
  const countdown = fmtCountdown(secs);
  const total = parseFloat(market.totalYesAmount) + parseFloat(market.totalNoAmount);
  const yPct  = total > 0 ? (parseFloat(market.totalYesAmount)/total*100).toFixed(0) : 50;
  const nPct  = total > 0 ? (parseFloat(market.totalNoAmount) /total*100).toFixed(0) : 50;

  const expired = secs === 0;
  const urgent  = secs > 0 && secs < 300;   // < 5 perc

  // Cím rövidítése
  const priceMatch = market.question.match(/(\w+)\s*árfolyam:\s*([\d.]+)\s*USD/);
  const title = priceMatch
    ? `${priceMatch[1]} $${priceMatch[2]}`
    : market.question.length > 58
    ? market.question.slice(0, 55) + '…'
    : market.question;

  return (
    <motion.div
      initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.22, delay: Math.min(index,8)*0.035 }}
      whileHover={{ y:-3 }}
      className="glass-card p-4 flex flex-col gap-3 cursor-pointer"
      style={{ borderColor: urgent ? 'rgba(251,146,60,0.4)' : 'var(--card-border)' }}
    >
      <Link to={`/market/${market.id}`} className="flex flex-col gap-3 h-full">
        {/* Cím */}
        <p className="text-sm font-semibold leading-snug" style={{ color:'var(--text-1)' }}>
          {title}
        </p>

        {/* Pool + visszaszámláló */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono" style={{ color:'var(--text-3)' }}>
            {total.toFixed(4)} ETH
          </span>
          {market.resolved ? (
            <span className="text-xs" style={{ color:'var(--text-3)' }}>Lezárva</span>
          ) : expired ? (
            <span className="text-orange-400 text-xs font-semibold">Feloldásra vár</span>
          ) : (
            <span className={`font-mono font-semibold text-xs tabular-nums ${
              urgent ? 'text-orange-400' : 'text-brand-400'
            }`}>
              {countdown}
            </span>
          )}
        </div>

        {/* Százalékos bar + gombok */}
        {!market.resolved ? (
          <>
            <div className="h-1.5 rounded-full overflow-hidden bg-rose-500/20">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width:`${yPct}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-center text-xs font-semibold py-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                {t('home.up')} {yPct}%
              </span>
              <span className="text-center text-xs font-semibold py-1 rounded-lg bg-rose-500/10 text-rose-400">
                {t('home.down')} {nPct}%
              </span>
            </div>
          </>
        ) : (
          <div className={`text-center text-xs font-bold py-1.5 rounded-lg ${
            market.winningOutcome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
            {t('home.result')}: {market.winningOutcome ? t('home.up') : t('home.down')}
          </div>
        )}
      </Link>
    </motion.div>
  );
}
