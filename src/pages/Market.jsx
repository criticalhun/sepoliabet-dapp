import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useMarket } from '../hooks/useMarket';
import { usePlaceBet, useClaim, useResolveMarket } from '../hooks/useBetting';
import { useAccount } from 'wagmi';
import { getOwner, getUserBets } from '../services/contractService';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useCountdown, fmtCountdown } from '../hooks/useCountdown';
import confetti from 'canvas-confetti';
import GlassCard from '../components/GlassCard';
import GradientButton from '../components/GradientButton';
import Spinner from '../components/Spinner';
import CryptoChart from '../components/CryptoChart';

const QUICK_BETS = ['0.01','0.05','0.1','0.5'];

// Élő ár Binance-ról
function useLivePrice(symbol) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!symbol) return;
    const pair = symbol + 'USDT';
    const fetch_ = async () => {
      try {
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
        const d = await res.json();
        setData(parseFloat(d.price));
      } catch {}
    };
    fetch_();
    const id = setInterval(fetch_, 10000);
    return () => clearInterval(id);
  }, [symbol]);
  return data;
}

export default function Market() {
  const { id } = useParams();
  const { t }  = useTranslation();
  const toast  = useToast();
  const market = useMarket(id);
  const { address } = useAccount();
  const { bet,     isLoading: betLoading     } = usePlaceBet();
  const { claim,   isLoading: claimLoading   } = useClaim();
  const { resolve, isLoading: resolveLoading } = useResolveMarket();

  const [amount,    setAmount]    = useState('0.01');
  const [outcome,   setOutcome]   = useState(true);
  const [isOwner,   setIsOwner]   = useState(false);
  const [userBets,  setUserBets]  = useState({ yes:'0', no:'0' });
  const [claimed,   setClaimed]   = useState(false);
  const [canClaim,  setCanClaim]  = useState(false);
  const [chartOpen, setChartOpen] = useState(true);

  const secs      = useCountdown(market?.endTime || 0);
  const countdown = fmtCountdown(secs);
  const urgent    = secs > 0 && secs < 300;

  // Kripto szimbólum kinyerése
  const parsed = useMemo(() => {
    if (!market) return null;
    const m = market.question.match(/(\w+)\s*árfolyam:\s*([\d.]+)\s*USD/);
    return m ? { symbol: m[1], target: parseFloat(m[2]) } : null;
  }, [market?.question]);

  const livePrice = useLivePrice(parsed?.symbol);

  useEffect(() => {
    if (!address) return;
    getOwner().then(o => setIsOwner(o.toLowerCase() === address.toLowerCase())).catch(()=>{});
  }, [address]);

  useEffect(() => {
    if (!address || !id || !market) return;
    let c = false;
    getUserBets(id, address).then(bets => {
      if (c) return;
      setUserBets(bets);
      if (market.resolved) {
        const w = market.winningOutcome ? parseFloat(bets.yes)>0 : parseFloat(bets.no)>0;
        setCanClaim(w && !claimed);
      }
    }).catch(()=>{});
    return () => { c = true; };
  }, [id, address, market?.resolved, market?.winningOutcome, claimed]);

  const handleBet = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.warning('Adj meg érvényes ETH összeget.');
      return;
    }
    try {
      await bet(id, outcome, amount);
      toast.success(`✓ ${outcome ? '📈 FEL' : '📉 LE'} fogadás leadva – ${amount} ETH`);
    } catch (e) {
      const msg = e.message?.includes('rejected') || e.message?.includes('denied')
        ? 'Tranzakció visszautasítva.'
        : e.message?.includes('insufficient')
        ? 'Nincs elég ETH az egyenlegeden.'
        : e.message?.includes('replacement fee') || e.message?.includes('underpriced')
        ? '⏳ Várj egy kicsit, majd próbáld újra.'
        : e.shortMessage || e.message?.slice(0,60) || 'Ismeretlen hiba';
      toast.error(msg);
    }
  }, [id, outcome, amount, bet, toast]);

  const handleClaim = useCallback(async () => {
    try {
      await claim(id);
      // 🎉 Konfetti
      confetti({
        particleCount: 180,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#818cf8','#22c55e','#f7931a','#ffffff','#a855f7'],
      });
      toast.success('🎉 Gratulálunk! Nyeremény sikeresen kivéve!', 6000);
      setClaimed(true);
      setCanClaim(false);
    } catch (e) {
      if (e.message?.includes('Already claimed')) { setClaimed(true); setCanClaim(false); }
      else toast.error('Hiba a kifizetésnél: ' + (e.shortMessage || e.message?.slice(0,50)));
    }
  }, [id, claim, toast]);

  const handleResolve = useCallback(async (wo) => {
    try {
      await resolve(id, wo);
      toast.success(`Piac #${id} feloldva: ${wo ? 'FEL' : 'LE'}`);
    } catch (e) { toast.error('Feloldás sikertelen.'); }
  }, [id, resolve, toast]);

  if (!market) return <Spinner />;

  const isEnded    = secs === 0;
  const isResolved = market.resolved;
  const total      = parseFloat(market.totalYesAmount) + parseFloat(market.totalNoAmount);
  const yPct       = total > 0 ? (parseFloat(market.totalYesAmount)/total*100) : 50;

  // Élő ár vs célár
  const priceDiff = parsed && livePrice
    ? ((livePrice - parsed.target) / parsed.target * 100)
    : null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className={`flex flex-col ${parsed ? 'lg:flex-row lg:gap-6 lg:items-start' : ''}`}>

        {/* BAL: Grafikon */}
        {parsed && (
          <div className="lg:flex-1 lg:min-w-0 mb-4 lg:mb-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color:'var(--text-3)' }}>
                  {parsed.symbol}/USDT
                </span>
                {/* Élő ár indikátor */}
                {livePrice && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono" style={{ color:'var(--text-1)' }}>
                      ${livePrice.toLocaleString('en-US',{maximumFractionDigits:2})}
                    </span>
                    {priceDiff !== null && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        priceDiff >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                      }`}>
                        {priceDiff >= 0 ? '▲' : '▼'} {Math.abs(priceDiff).toFixed(2)}%
                      </span>
                    )}
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                )}
              </div>
              <button onClick={() => setChartOpen(o => !o)}
                className="text-xs px-2.5 py-1 rounded-lg transition-colors font-medium"
                style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', color:'var(--text-2)' }}>
                {chartOpen ? t('market.chart_hide') : t('market.chart_show')}
              </button>
            </div>

            <AnimatePresence>
              {chartOpen && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
                  exit={{ opacity:0, height:0 }} transition={{ duration:0.2 }} className="overflow-hidden">
                  <CryptoChart symbol={parsed.symbol} height={320} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Célár vs aktuális */}
            {parsed && livePrice && (
              <div className="mt-3 p-3 rounded-xl glass flex items-center justify-between gap-4"
                style={{ border:'1px solid var(--card-border)' }}>
                <div className="text-center">
                  <p className="text-xs mb-1" style={{ color:'var(--text-3)' }}>Célárfolyam</p>
                  <p className="text-sm font-bold font-mono" style={{ color:'var(--text-2)' }}>
                    ${parsed.target.toLocaleString('en-US',{maximumFractionDigits:2})}
                  </p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-xs mb-1" style={{ color:'var(--text-3)' }}>Különbség</p>
                  <p className={`text-lg font-bold font-mono ${
                    priceDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {priceDiff >= 0 ? '+':''}{priceDiff?.toFixed(2)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs mb-1" style={{ color:'var(--text-3)' }}>Aktuális</p>
                  <p className="text-sm font-bold font-mono text-brand-400">
                    ${livePrice.toLocaleString('en-US',{maximumFractionDigits:2})}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* JOBB: Fogadási panel */}
        <div className={parsed ? 'lg:w-80 lg:flex-shrink-0' : 'w-full max-w-lg mx-auto'}>
          <div className="lg:sticky lg:top-20">
            <GlassCard className="p-0 overflow-hidden">

              {/* Fejléc */}
              <div className="p-5 border-b" style={{ borderColor:'var(--card-border)' }}>
                {parsed ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color:'var(--text-3)' }}>
                      {t('market.base_price')}
                    </p>
                    <p className="text-3xl font-bold font-mono text-brand-400 mb-1">
                      ${parsed.target.toLocaleString('en-US',{maximumFractionDigits:2})}
                    </p>
                    <p className="text-xs" style={{ color:'var(--text-2)' }}>
                      {t('market.higher_at')}: {new Date(market.endTime*1000).toLocaleString()}
                    </p>
                  </>
                ) : (
                  <p className="text-base font-semibold leading-snug" style={{ color:'var(--text-1)' }}>
                    {market.question}
                  </p>
                )}
              </div>

              {/* Tétek */}
              <div className="p-4 border-b" style={{ borderColor:'var(--card-border)' }}>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-xl p-3 text-center bg-emerald-500/8 border border-emerald-500/15">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">
                      {t('market.up_stake')}
                    </p>
                    <p className="text-base font-bold font-mono text-emerald-400">{market.totalYesAmount} ETH</p>
                    <p className="text-xs text-emerald-500/70">{yPct.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-xl p-3 text-center bg-rose-500/8 border border-rose-500/15">
                    <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
                      {t('market.down_stake')}
                    </p>
                    <p className="text-base font-bold font-mono text-rose-400">{market.totalNoAmount} ETH</p>
                    <p className="text-xs text-rose-500/70">{(100-yPct).toFixed(1)}%</p>
                  </div>
                </div>

                <div className="h-1.5 rounded-full overflow-hidden bg-rose-500/20">
                  <motion.div className="h-full bg-emerald-500 rounded-full"
                    initial={{ width:0 }} animate={{ width:`${yPct}%` }}
                    transition={{ duration:0.8, ease:'easeOut' }} />
                </div>

                {!isResolved && (
                  <div className="mt-2.5 text-center">
                    {isEnded ? (
                      <span className="text-xs text-orange-400 font-semibold">{t('market.expired')}</span>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-xs" style={{ color:'var(--text-3)' }}>{t('market.expires')}:</span>
                        <span className={`text-sm font-bold font-mono tabular-nums ${urgent ? 'text-orange-400' : 'text-brand-400'}`}>
                          {countdown}
                        </span>
                        {urgent && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Eredmény */}
              {isResolved && (
                <div className={`mx-4 mt-4 py-3 rounded-xl text-center font-bold text-sm ${
                  market.winningOutcome
                    ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/12 text-rose-400 border border-rose-500/20'
                }`}>
                  {t('market.result')}: {market.winningOutcome ? t('market.up') : t('market.down')}
                </div>
              )}

              {/* Fogadási form */}
              {!isResolved && !isEnded && address && (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[true, false].map(o => (
                      <button key={String(o)} onClick={() => setOutcome(o)}
                        className={`py-3 rounded-xl font-bold text-sm transition-all ${
                          outcome===o
                            ? o ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                                : 'bg-rose-600 text-white shadow-lg shadow-rose-900/30'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                        style={outcome!==o ? { background:'var(--bg-raised)', border:'1px solid var(--card-border)' } : {}}>
                        {o ? '📈 FEL' : '📉 LE'}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {QUICK_BETS.map(q => (
                      <button key={q} onClick={() => setAmount(q)}
                        className="py-1.5 rounded-lg text-xs font-mono font-semibold transition-all"
                        style={{
                          background: amount===q ? 'rgba(99,102,241,0.2)' : 'var(--bg-raised)',
                          color:      amount===q ? '#818cf8' : 'var(--text-2)',
                          border:     amount===q ? '1px solid rgba(99,102,241,0.35)' : '1px solid var(--card-border)',
                        }}>
                        {q}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                    style={{ background:'var(--bg-raised)', border:'1px solid var(--card-border)' }}>
                    <span className="text-sm font-semibold" style={{ color:'var(--text-3)' }}>ETH</span>
                    <input type="number" step="0.001" min="0.001" value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="flex-1 bg-transparent font-mono text-sm focus:outline-none"
                      style={{ color:'var(--text-1)' }} placeholder="0.01" />
                  </div>

                  <GradientButton onClick={handleBet} disabled={betLoading} className="w-full py-3 text-sm font-bold">
                    {betLoading ? t('market.processing') : `${t('market.bet')} — ${outcome ? '📈 FEL' : '📉 LE'}`}
                  </GradientButton>
                </div>
              )}

              {/* Nyeremény kivétel */}
              {canClaim && address && (
                <div className="px-4 pb-4">
                  <GradientButton onClick={handleClaim} disabled={claimLoading} className="w-full py-3 text-sm font-bold">
                    {claimLoading ? t('market.claiming') : t('market.claim')}
                  </GradientButton>
                </div>
              )}
              {claimed && (
                <div className="px-4 pb-4 text-center text-sm font-semibold text-emerald-400">
                  {t('market.claimed')}
                </div>
              )}
              {isResolved && !canClaim && !claimed &&
               parseFloat(userBets.yes)===0 && parseFloat(userBets.no)===0 && (
                <p className="px-4 pb-4 text-center text-xs" style={{ color:'var(--text-3)' }}>
                  {t('market.no_win')}
                </p>
              )}

              {!address && (
                <p className="px-4 pb-4 text-center text-sm" style={{ color:'var(--text-2)' }}>
                  {t('market.connect')}
                </p>
              )}
              {isEnded && !isResolved && (
                <p className="px-4 pb-4 text-center text-sm text-orange-400">{t('market.expired')}</p>
              )}

              {/* Owner feloldás */}
              {isOwner && !isResolved && isEnded && (
                <div className="mx-4 mb-4 p-4 rounded-xl"
                  style={{ background:'var(--bg-raised)', border:'1px solid var(--card-border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color:'var(--text-3)' }}>
                    {t('market.resolve')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleResolve(true)} disabled={resolveLoading}
                      className="py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                      {t('market.up_won')}
                    </button>
                    <button onClick={() => handleResolve(false)} disabled={resolveLoading}
                      className="py-2.5 bg-rose-700 hover:bg-rose-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                      {t('market.down_won')}
                    </button>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
