import { useState, useEffect, useMemo } from 'react';
import { useMarkets } from '../hooks/useMarket';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { getUserBet } from '../services/contractService';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import Spinner from '../components/Spinner';
import GradientButton from '../components/GradientButton';

const SORTS = ['sort_newest', 'sort_ending', 'sort_volume'];

export default function Home() {
  const { t } = useTranslation();
  const { markets, loading } = useMarkets();
  const { address } = useAccount();
  const [tab, setTab] = useState('active');
  const [sort, setSort] = useState('sort_newest');
  const [myMarkets, setMyMarkets] = useState([]);

  // Saját fogadások
  useEffect(() => {
    if (!address || !markets.length) { setMyMarkets([]); return; }
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
      setMyMarkets(res);
    })();
  }, [markets, address]);

  const active   = markets.filter(m => !m.resolved);
  const resolved = markets.filter(m => m.resolved);

  const sorted = useMemo(() => {
    const list = tab === 'active' ? active : tab === 'results' ? resolved : myMarkets;
    if (sort === 'sort_ending') return [...list].sort((a,b) => a.endTime - b.endTime);
    if (sort === 'sort_volume') return [...list].sort((a,b) =>
      (parseFloat(b.totalYesAmount)+parseFloat(b.totalNoAmount)) -
      (parseFloat(a.totalYesAmount)+parseFloat(a.totalNoAmount)));
    return list; // newest (already reversed in hook)
  }, [tab, sort, active, resolved, myMarkets]);

  const titleKey = { active:'title_active', results:'title_results', mybets:'title_mybets' }[tab];
  const subKey   = { active:'sub_active',   results:'sub_results',   mybets:'sub_mybets'  }[tab];
  const emptyKey = { active:'no_active',    results:'no_resolved',   mybets:'no_mybets'   }[tab];

  return (
    <div>
      {/* Hero */}
      <div className="mb-6">
        <motion.h1
          key={titleKey}
          initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          className="text-3xl md:text-4xl font-bold gradient-text mb-1"
        >
          {t(`home.${titleKey}`)}
        </motion.h1>
        <motion.p
          key={subKey}
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.05 }}
          className="text-sm" style={{ color:'var(--text-2)' }}
        >
          {t(`home.${subKey}`)}
        </motion.p>
      </div>

      {/* Tabs + Sort bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)' }}>
          {[
            { key:'active',  label: `${t('home.tab_active')} (${active.length})` },
            { key:'results', label: `${t('home.tab_results')} (${resolved.length})` },
            ...(address ? [{ key:'mybets', label: `${t('home.tab_mybets')} (${myMarkets.length})` }] : []),
          ].map(tab_ => (
            <button key={tab_.key} onClick={() => setTab(tab_.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === tab_.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: tab === tab_.key ? '#818cf8' : 'var(--text-2)',
              }}
            >
              {tab_.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex gap-1">
          {SORTS.map(s => (
            <button key={s} onClick={() => setSort(s)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: sort === s ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: sort === s ? '#818cf8' : 'var(--text-3)',
                border: sort === s ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
              }}
            >
              {t(`home.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? <Spinner /> : sorted.length === 0 ? (
        <p className="text-center py-16 text-sm" style={{ color:'var(--text-3)' }}>
          {t(`home.${emptyKey}`)}
        </p>
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
  const total = parseFloat(market.totalYesAmount) + parseFloat(market.totalNoAmount);
  const yPct  = total > 0 ? (parseFloat(market.totalYesAmount)/total*100).toFixed(0) : 50;
  const nPct  = total > 0 ? (parseFloat(market.totalNoAmount)/total*100).toFixed(0) : 50;
  const end   = new Date(market.endTime * 1000);
  const now   = Date.now() / 1000;
  const secs  = market.endTime - now;
  const soon  = secs > 0 && secs < 300;

  // Letisztított cím
  const priceMatch = market.question.match(/árfolyam:\s*([\d.]+)\s*USD/);
  const title = priceMatch
    ? `${market.question.match(/^(\w+)/)?.[1] || 'BTC'} $${priceMatch[1]}`
    : market.question.length > 60
    ? market.question.slice(0, 57) + '…'
    : market.question;

  return (
    <motion.div
      initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.25, delay: Math.min(index,8) * 0.04 }}
      whileHover={{ y:-3 }}
      className="glass-card p-4 flex flex-col gap-3 cursor-pointer"
      style={{ borderColor: soon ? 'rgba(251,146,60,0.3)' : 'var(--card-border)' }}
    >
      <Link to={`/market/${market.id}`} className="flex flex-col gap-3 h-full">

        {/* Title */}
        <p className="text-sm font-semibold leading-snug" style={{ color:'var(--text-1)' }}>{title}</p>

        {/* Pool + date */}
        <div className="flex items-center justify-between text-xs" style={{ color:'var(--text-3)' }}>
          <span className="font-mono">{total.toFixed(4)} ETH</span>
          <span className={soon ? 'text-orange-400 font-semibold' : ''}>
            {soon
              ? `${Math.floor(secs/60)}m ${Math.floor(secs%60)}s`
              : end.toLocaleDateString()}
          </span>
        </div>

        {/* Bars */}
        {!market.resolved ? (
          <>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'var(--card-border)' }}>
              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                style={{ width: `${yPct}%` }} />
            </div>
            <div className="flex gap-2">
              <span className="flex-1 text-center text-xs font-semibold py-1 rounded-lg bg-emerald-500/10 text-emerald-400">{t('home.up')} {yPct}%</span>
              <span className="flex-1 text-center text-xs font-semibold py-1 rounded-lg bg-rose-500/10 text-rose-400">{t('home.down')} {nPct}%</span>
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
