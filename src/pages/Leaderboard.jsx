import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CONTRACT_ADDRESS } from '../contracts/contractAddress';
import BettingMarketABI from '../contracts/BettingMarket.json';
import GlassCard from '../components/GlassCard';
import Spinner from '../components/Spinner';

const MEDAL = { 1:'🥇', 2:'🥈', 3:'🥉' };

export default function Leaderboard() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!window.ethereum) { setLoading(false); return; }
    (async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, BettingMarketABI, provider);
        const latest   = await provider.getBlockNumber();
        const from     = Math.max(0, latest - 100000);

        const [claimEvts, betEvts] = await Promise.all([
          contract.queryFilter(contract.filters.WinningsClaimed(), from, 'latest'),
          contract.queryFilter(contract.filters.BetPlaced(), from, 'latest'),
        ]);

        // Aggregate winnings per address
        const wins = {};
        claimEvts.forEach(e => {
          const addr   = e.args[1];
          const amount = e.args[2];
          wins[addr] = (wins[addr] || 0n) + amount;
        });

        // Count bets per address
        const bets = {};
        betEvts.forEach(e => {
          const addr = e.args[1];
          bets[addr] = (bets[addr] || 0) + 1;
        });

        const sorted = Object.entries(wins)
          .sort(([,a],[,b]) => b > a ? 1 : -1)
          .slice(0, 25)
          .map(([addr, won], i) => ({
            rank: i + 1,
            address: addr,
            won: parseFloat(ethers.formatEther(won)),
            bets: bets[addr] || 0,
          }));

        setRows(sorted);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-8">
        <motion.div initial={{ scale:0.8, opacity:0 }} animate={{ scale:1, opacity:1 }}
          className="text-5xl mb-3">🏆</motion.div>
        <h1 className="text-3xl font-bold gradient-text mb-2">{t('leaderboard.title')}</h1>
        <p className="text-sm" style={{ color:'var(--text-2)' }}>{t('leaderboard.subtitle')}</p>
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? (
        <p className="text-center py-16 text-sm" style={{ color:'var(--text-3)' }}>
          {t('leaderboard.empty')}
        </p>
      ) : (
        <GlassCard className="p-0 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider"
            style={{ borderColor:'var(--card-border)', color:'var(--text-3)' }}>
            <div className="col-span-1">#</div>
            <div className="col-span-6">{t('leaderboard.col_address')}</div>
            <div className="col-span-2 text-center">{t('leaderboard.col_bets')}</div>
            <div className="col-span-3 text-right">{t('leaderboard.col_won')}</div>
          </div>

          {rows.map((row, i) => (
            <motion.div key={row.address}
              initial={{ opacity:0, x:-8 }}
              animate={{ opacity:1, x:0 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-12 items-center px-4 py-3 transition-colors hover:bg-white/3"
              style={{ borderBottom: i < rows.length-1 ? `1px solid var(--card-border)` : 'none' }}
            >
              <div className="col-span-1">
                {MEDAL[row.rank] ? (
                  <span className="text-base">{MEDAL[row.rank]}</span>
                ) : (
                  <span className="text-sm font-bold" style={{ color:'var(--text-3)' }}>{row.rank}</span>
                )}
              </div>

              <div className="col-span-6">
                <span className="text-sm font-mono" style={{ color:'var(--text-1)' }}>
                  {row.address.slice(0,8)}…{row.address.slice(-6)}
                </span>
              </div>

              <div className="col-span-2 text-center">
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 font-semibold">
                  {row.bets}
                </span>
              </div>

              <div className="col-span-3 text-right">
                <span className="text-sm font-bold font-mono text-emerald-400">
                  {row.won.toFixed(4)} ETH
                </span>
              </div>
            </motion.div>
          ))}
        </GlassCard>
      )}
    </div>
  );
}
