import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CONTRACT_ADDRESS } from '../contracts/contractAddress';
import BettingMarketABI from '../contracts/BettingMarket.json';
import { useMarkets } from '../hooks/useMarket';
import GlassCard from '../components/GlassCard';
import Spinner from '../components/Spinner';
import GradientButton from '../components/GradientButton';

function StatCard({ value, label, color }) {
  return (
    <GlassCard className="p-4 text-center" delay={0}>
      <p className={`text-2xl font-bold font-mono mb-1 ${color || 'gradient-text'}`}>{value}</p>
      <p className="text-xs" style={{ color:'var(--text-3)' }}>{label}</p>
    </GlassCard>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const { address } = useAccount();
  const { markets } = useMarkets();
  const [bets,    setBets]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState({ placed:0, won:0, totalBet:0, totalWon:0 });

  useEffect(() => {
    if (!address || !window.ethereum) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, BettingMarketABI, provider);
        const latest   = await provider.getBlockNumber();
        const from     = Math.max(0, latest - 100000);

        const [betEvts, claimEvts] = await Promise.all([
          contract.queryFilter(contract.filters.BetPlaced(null, address), from, 'latest'),
          contract.queryFilter(contract.filters.WinningsClaimed(null, address), from, 'latest'),
        ]);

        if (cancelled) return;

        const totalBet = betEvts.reduce((s, e) => s + e.args[3], 0n);
        const totalWon = claimEvts.reduce((s, e) => s + e.args[2], 0n);

        setStats({
          placed:   betEvts.length,
          won:      claimEvts.length,
          totalBet: parseFloat(ethers.formatEther(totalBet)),
          totalWon: parseFloat(ethers.formatEther(totalWon)),
        });

        setBets(betEvts.reverse().slice(0, 30).map(e => ({
          marketId: Number(e.args[0]),
          outcome:  e.args[2],
          amount:   parseFloat(ethers.formatEther(e.args[3])).toFixed(4),
          txHash:   e.transactionHash,
        })));
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [address]);

  if (!address) return (
    <div className="max-w-md mx-auto text-center py-24">
      <div className="text-5xl mb-4">👤</div>
      <h2 className="text-xl font-bold mb-3" style={{ color:'var(--text-1)' }}>
        {t('profile.not_connected')}
      </h2>
      <p className="text-sm mb-6" style={{ color:'var(--text-2)' }}>
        {t('profile.connect_prompt')}
      </p>
    </div>
  );

  const pnl      = stats.totalWon - stats.totalBet;
  const winRate  = stats.placed > 0 ? ((stats.won / stats.placed) * 100).toFixed(1) : '0.0';
  const pnlColor = pnl > 0 ? 'text-emerald-400' : pnl < 0 ? 'text-rose-400' : 'text-gray-400';
  const pnlStr   = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(4)} ETH`;

  // Avatar color from address
  const hue = parseInt(address.slice(2, 4), 16) / 255 * 360;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Profile header */}
      <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
        className="flex items-center gap-5 mb-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-glow flex-shrink-0"
          style={{ background:`linear-gradient(135deg, hsl(${hue},70%,50%), hsl(${hue+60},70%,40%))` }}
        >
          {address.slice(2, 4).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold font-mono" style={{ color:'var(--text-1)' }}>
            {address.slice(0,8)}…{address.slice(-6)}
          </h1>
          <p className="text-xs mt-0.5" style={{ color:'var(--text-3)' }}>
            Sepolia Testnet
          </p>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard value={stats.placed}  label={t('profile.stat_bets')} />
        <StatCard value={`${winRate}%`} label={t('profile.stat_winrate')} />
        <StatCard
          value={`${stats.totalBet.toFixed(4)} ETH`}
          label={t('profile.stat_wagered')}
        />
        <StatCard value={pnlStr} label="P&L" color={pnlColor} />
      </div>

      {/* Bet history */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor:'var(--card-border)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color:'var(--text-2)' }}>
            {t('profile.history')}
          </h2>
        </div>

        {loading ? (
          <div className="py-8"><Spinner /></div>
        ) : bets.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color:'var(--text-3)' }}>{t('profile.no_bets')}</p>
            <Link to="/" className="inline-block mt-4">
              <GradientButton className="py-2 px-6 text-sm">
                {t('profile.browse_markets')}
              </GradientButton>
            </Link>
          </div>
        ) : (
          <div>
            {bets.map((b, i) => {
              const market = markets.find(m => m.id === b.marketId);
              const sym = market?.question.match(/^(\w+)/)?.[1] || '?';
              return (
                <motion.div key={b.txHash}
                  initial={{ opacity:0 }} animate={{ opacity:1 }}
                  transition={{ delay: Math.min(i, 10) * 0.03 }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-white/3 transition-colors"
                  style={{ borderBottom: i < bets.length-1 ? `1px solid var(--card-border)` : 'none' }}
                >
                  {/* Symbol badge */}
                  <span className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0"
                    style={{ background:'rgba(99,102,241,0.1)', color:'#818cf8' }}>
                    {sym}
                  </span>

                  {/* Direction */}
                  <span className={`text-xs font-bold flex-shrink-0 ${
                    b.outcome ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {b.outcome ? '📈' : '📉'}
                  </span>

                  {/* Title */}
                  <Link to={`/market/${b.marketId}`}
                    className="flex-1 text-xs truncate hover:text-brand-400 transition-colors min-w-0"
                    style={{ color:'var(--text-2)' }}>
                    {market?.question
                      ? market.question.length > 50
                        ? market.question.slice(0, 48) + '…'
                        : market.question
                      : `Piac #${b.marketId}`}
                  </Link>

                  {/* Amount */}
                  <span className="text-xs font-bold font-mono text-brand-400 flex-shrink-0">
                    {b.amount} ETH
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
