import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useMarket } from '../hooks/useMarket';
import { usePlaceBet, useClaim, useResolveMarket } from '../hooks/useBetting';
import { useAccount } from 'wagmi';
import { getOwner, getUserBets } from '../services/contractService';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useCountdown, fmtCountdown } from '../hooks/useCountdown';
import GlassCard from '../components/GlassCard';
import GradientButton from '../components/GradientButton';
import Spinner from '../components/Spinner';
import CryptoChart from '../components/CryptoChart';

const QUICK_BETS = ['0.01', '0.05', '0.1', '0.5'];

export default function Market() {
  const { id } = useParams();
  const { t } = useTranslation();
  const market = useMarket(id);
  const { address } = useAccount();
  const { bet,     isLoading: betLoading     } = usePlaceBet();
  const { claim,   isLoading: claimLoading   } = useClaim();
  const { resolve, isLoading: resolveLoading } = useResolveMarket();

  const [amount,   setAmount]   = useState('0.01');
  const [outcome,  setOutcome]  = useState(true);   // true=FEL, false=LE
  const [isOwner,  setIsOwner]  = useState(false);
  const [userBets, setUserBets] = useState({ yes:'0', no:'0' });
  const [claimed,  setClaimed]  = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [chartOpen, setChartOpen] = useState(true);
  const [betMsg,   setBetMsg]   = useState({ type:'', text:'' });

  // Countdown
  const secs = useCountdown(market?.endTime || 0);
  const countdown = fmtCountdown(secs);
  const urgent  = secs > 0 && secs < 300;

  // Owner ellenőrzés
  useEffect(() => {
    if (!address) return;
    getOwner()
      .then(owner => setIsOwner(owner.toLowerCase() === address.toLowerCase()))
      .catch(console.error);
  }, [address]);

  // Felhasználó tétjeinek lekérése
  useEffect(() => {
    if (!address || !id || !market) return;
    let cancelled = false;
    getUserBets(id, address)
      .then(bets => {
        if (cancelled) return;
        setUserBets(bets);
        if (market.resolved) {
          const hasWin = market.winningOutcome
            ? parseFloat(bets.yes) > 0
            : parseFloat(bets.no)  > 0;
          setCanClaim(hasWin && !claimed);
        }
      })
      .catch(console.error);
    return () => { cancelled = true; };
  }, [id, address, market?.resolved, market?.winningOutcome, claimed]);

  // Kripto szimbólum és ár a kérdésből
  const parsed = useMemo(() => {
    if (!market) return null;
    const m = market.question.match(/(\w+)\s*árfolyam:\s*([\d.]+)\s*USD/);
    if (!m) return null;
    return { symbol: m[1], price: m[2] };
  }, [market?.question]);

  const isCryptoMarket = !!parsed;

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleBet = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setBetMsg({ type:'error', text:'Adj meg érvényes ETH összeget.' });
      return;
    }
    setBetMsg({ type:'loading', text:'Tranzakció küldése...' });
    try {
      await bet(id, outcome, amount);
      setBetMsg({ type:'success', text:'✓ Fogadás sikeresen leadva!' });
      setTimeout(() => setBetMsg({ type:'', text:'' }), 5000);
    } catch (e) {
      const msg =
        e.message?.includes('rejected') || e.message?.includes('denied')
          ? 'Tranzakció visszautasítva.'
          : e.message?.includes('insufficient')
          ? 'Nincs elég ETH az egyenlegeden.'
          : 'Hiba: ' + (e.shortMessage || e.message?.slice(0, 80) || 'Ismeretlen hiba');
      setBetMsg({ type:'error', text: msg });
    }
  }, [id, outcome, amount, bet]);

  const handleClaim = useCallback(async () => {
    try {
      await claim(id);
      setClaimed(true);
      setCanClaim(false);
    } catch (e) {
      if (e.message?.includes('Already claimed')) {
        setClaimed(true);
        setCanClaim(false);
      }
    }
  }, [id, claim]);

  const handleResolve = useCallback(async (wo) => {
    try { await resolve(id, wo); }
    catch (e) { console.error(e); }
  }, [id, resolve]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (!market) return <Spinner />;

  const isEnded    = secs === 0;
  const isResolved = market.resolved;

  const total = parseFloat(market.totalYesAmount) + parseFloat(market.totalNoAmount);
  const yPct  = total > 0 ? (parseFloat(market.totalYesAmount) / total * 100).toFixed(1) : '50.0';
  const nPct  = total > 0 ? (parseFloat(market.totalNoAmount)  / total * 100).toFixed(1) : '50.0';

  return (
    <div className="max-w-6xl mx-auto">
      <div className={`flex flex-col ${isCryptoMarket ? 'lg:flex-row lg:gap-6 lg:items-start' : ''}`}>

        {/* ── BAL: Grafikon ──────────────────────────────────────────── */}
        {isCryptoMarket && (
          <div className="lg:flex-1 lg:min-w-0 mb-4 lg:mb-0">
            {/* Toggle */}
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color:'var(--text-3)' }}>
                {parsed.symbol}/USDT
              </span>
              <button
                onClick={() => setChartOpen(o => !o)}
                className="text-xs px-2.5 py-1 rounded-lg transition-colors font-medium"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--text-2)',
                }}
              >
                {chartOpen ? t('market.chart_hide') : t('market.chart_show')}
              </button>
            </div>

            <AnimatePresence>
              {chartOpen && (
                <motion.div
                  initial={{ opacity:0, height:0 }}
                  animate={{ opacity:1, height:'auto' }}
                  exit={{ opacity:0, height:0 }}
                  transition={{ duration:0.2 }}
                  className="overflow-hidden"
                >
                  <CryptoChart symbol={parsed.symbol} height={320} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── JOBB: Fogadási panel ────────────────────────────────────── */}
        <div className={isCryptoMarket ? 'lg:w-80 lg:flex-shrink-0' : 'w-full max-w-lg mx-auto'}>
          <div className="lg:sticky lg:top-20">
            <GlassCard className="p-0 overflow-hidden">

              {/* ── Fejléc ── */}
              <div className="p-5 border-b" style={{ borderColor:'var(--card-border)' }}>
                {isCryptoMarket ? (
                  <>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color:'var(--text-3)' }}>
                        {t('market.base_price')}
                      </span>
                    </div>
                    <p className="text-3xl font-bold font-mono text-brand-400 mb-1">
                      ${parsed.price}
                    </p>
                    <p className="text-xs" style={{ color:'var(--text-2)' }}>
                      {t('market.higher_at')}: {new Date(market.endTime * 1000).toLocaleString()}
                    </p>
                  </>
                ) : (
                  <p className="text-base font-semibold leading-snug" style={{ color:'var(--text-1)' }}>
                    {market.question}
                  </p>
                )}
              </div>

              {/* ── Tétek + visszaszámláló ── */}
              <div className="p-4 border-b" style={{ borderColor:'var(--card-border)' }}>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-xl p-3 text-center bg-emerald-500/8 border border-emerald-500/15">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">
                      {t('market.up_stake')}
                    </p>
                    <p className="text-base font-bold font-mono text-emerald-400">
                      {market.totalYesAmount} ETH
                    </p>
                    <p className="text-xs text-emerald-500/70">{yPct}%</p>
                  </div>
                  <div className="rounded-xl p-3 text-center bg-rose-500/8 border border-rose-500/15">
                    <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">
                      {t('market.down_stake')}
                    </p>
                    <p className="text-base font-bold font-mono text-rose-400">
                      {market.totalNoAmount} ETH
                    </p>
                    <p className="text-xs text-rose-500/70">{nPct}%</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full overflow-hidden bg-rose-500/20">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width:`${yPct}%` }}
                  />
                </div>

                {/* Visszaszámláló */}
                {!isResolved && (
                  <div className="mt-3 text-center">
                    {isEnded ? (
                      <span className="text-xs text-orange-400 font-semibold">
                        {t('market.expired')}
                      </span>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-xs" style={{ color:'var(--text-3)' }}>
                          {t('market.expires')}:
                        </span>
                        <span className={`text-sm font-bold font-mono tabular-nums ${
                          urgent ? 'text-orange-400' : 'text-brand-400'
                        }`}>
                          {countdown}
                        </span>
                        {urgent && (
                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-orange-400 animate-ping" />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Eredmény (ha lezárt) ── */}
              {isResolved && (
                <div className={`mx-4 mt-4 py-3 px-4 rounded-xl text-center font-bold text-sm ${
                  market.winningOutcome
                    ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/12 text-rose-400 border border-rose-500/20'
                }`}>
                  {t('market.result')}: {market.winningOutcome ? t('market.up') : t('market.down')}
                </div>
              )}

              {/* ── Fogadási form ── */}
              {!isResolved && !isEnded && address && (
                <div className="p-4 space-y-3">
                  {/* FEL / LE gombok */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setOutcome(true)}
                      className={`py-3 rounded-xl font-bold text-sm transition-all ${
                        outcome
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                      style={!outcome ? { background:'var(--bg-raised)', border:'1px solid var(--card-border)' } : {}}
                    >
                      📈 {t('market.up').replace('📈 ','')}
                    </button>
                    <button
                      onClick={() => setOutcome(false)}
                      className={`py-3 rounded-xl font-bold text-sm transition-all ${
                        !outcome
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                      style={outcome ? { background:'var(--bg-raised)', border:'1px solid var(--card-border)' } : {}}
                    >
                      📉 {t('market.down').replace('📉 ','')}
                    </button>
                  </div>

                  {/* Quick bet preset gombok */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {QUICK_BETS.map(q => (
                      <button
                        key={q}
                        onClick={() => setAmount(q)}
                        className="py-1.5 rounded-lg text-xs font-mono font-semibold transition-all"
                        style={{
                          background: amount===q
                            ? 'rgba(99,102,241,0.2)'
                            : 'var(--bg-raised)',
                          color: amount===q ? '#818cf8' : 'var(--text-2)',
                          border: amount===q
                            ? '1px solid rgba(99,102,241,0.35)'
                            : '1px solid var(--card-border)',
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  {/* Összeg input */}
                  <div
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                    style={{ background:'var(--bg-raised)', border:'1px solid var(--card-border)' }}
                  >
                    <span className="text-sm font-semibold" style={{ color:'var(--text-3)' }}>ETH</span>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={amount}
                      onChange={e => { setAmount(e.target.value); setBetMsg({ type:'', text:'' }); }}
                      className="flex-1 bg-transparent font-mono text-sm focus:outline-none"
                      style={{ color:'var(--text-1)' }}
                      placeholder="0.01"
                    />
                  </div>

                  {/* Fogadás gomb */}
                  <GradientButton
                    onClick={handleBet}
                    disabled={betLoading}
                    className="w-full py-3 text-sm font-bold"
                  >
                    {betLoading
                      ? t('market.processing')
                      : `${t('market.bet')} — ${outcome ? '📈' : '📉'} ${outcome
                          ? t('market.up').replace('📈 ','')
                          : t('market.down').replace('📉 ','')}`
                    }
                  </GradientButton>

                  {/* Fogadási visszajelzés */}
                  <AnimatePresence>
                    {betMsg.text && (
                      <motion.div
                        initial={{ opacity:0, y:-4 }}
                        animate={{ opacity:1, y:0 }}
                        exit={{ opacity:0 }}
                        className={`px-3 py-2 rounded-lg text-xs font-medium text-center ${
                          betMsg.type === 'success' ? 'bg-emerald-500/15 text-emerald-400' :
                          betMsg.type === 'error'   ? 'bg-rose-500/15 text-rose-400' :
                                                      'bg-brand-500/15 text-brand-400'
                        }`}
                      >
                        {betMsg.text}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ── Nyeremény kivétel ── */}
              {(canClaim || claimed || (isResolved && address)) && (
                <div className="px-4 pb-4">
                  {canClaim && (
                    <GradientButton
                      onClick={handleClaim}
                      disabled={claimLoading}
                      className="w-full py-3 text-sm font-bold"
                    >
                      {claimLoading ? t('market.claiming') : t('market.claim')}
                    </GradientButton>
                  )}
                  {claimed && (
                    <div className="text-center py-2 text-sm font-semibold text-emerald-400">
                      {t('market.claimed')}
                    </div>
                  )}
                  {isResolved && !canClaim && !claimed &&
                    parseFloat(userBets.yes) === 0 && parseFloat(userBets.no) === 0 && (
                    <p className="text-center text-xs py-2" style={{ color:'var(--text-3)' }}>
                      {t('market.no_win')}
                    </p>
                  )}
                </div>
              )}

              {/* ── Nem csatlakoztatott ── */}
              {!address && (
                <div className="px-4 pb-4 text-center text-sm" style={{ color:'var(--text-2)' }}>
                  {t('market.connect')}
                </div>
              )}

              {/* ── Owner feloldás panel ── */}
              {isOwner && !isResolved && isEnded && (
                <div className="mx-4 mb-4 p-4 rounded-xl"
                  style={{ background:'var(--bg-raised)', border:'1px solid var(--card-border)' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color:'var(--text-3)' }}>
                    {t('market.resolve')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleResolve(true)}
                      disabled={resolveLoading}
                      className="py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                    >
                      {t('market.up_won')}
                    </button>
                    <button
                      onClick={() => handleResolve(false)}
                      disabled={resolveLoading}
                      className="py-2.5 bg-rose-700 hover:bg-rose-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                    >
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
