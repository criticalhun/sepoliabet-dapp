import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMarkets } from '../hooks/useMarket';

const PAGES = [
  { label:'Piacok',    sub:'Főoldal',    to:'/',            icon:'📊' },
  { label:'Rangsor',   sub:'Top traders', to:'/leaderboard', icon:'🏆' },
  { label:'Profilom',  sub:'Saját stats', to:'/profile',     icon:'👤' },
];

export default function CommandPalette() {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const { markets } = useMarkets();
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => ref.current?.focus(), 50); }
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) return PAGES;
    const q = query.toLowerCase();
    return markets
      .filter(m => m.question.toLowerCase().includes(q))
      .slice(0, 7)
      .map(m => {
        const sym = m.question.match(/^(BTC|ETH|SOL|BNB)/)?.[1];
        return {
          label: m.question.length > 52 ? m.question.slice(0,50)+'…' : m.question,
          sub: `#${m.id} · ${m.resolved ? 'Lezárva' : 'Aktív'}`,
          to: `/market/${m.id}`,
          icon: sym || '📈',
        };
      });
  }, [query, markets]);

  const go = (to) => { navigate(to); setOpen(false); };

  return (
    <>
      {/* Gomb a Headerben */}
      <button onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 h-8 px-3 rounded-lg text-xs transition-colors hover:opacity-80"
        style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', color:'var(--text-3)' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <span>Keresés</span>
        <kbd className="text-[10px] px-1 rounded ml-1"
          style={{ background:'var(--bg-raised)', border:'1px solid var(--card-border)', color:'var(--text-3)' }}>
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity:0, y:-20, scale:0.96 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:-20, scale:0.96 }}
              transition={{ type:'spring', stiffness:340, damping:26 }}
              className="fixed top-[12%] left-1/2 -translate-x-1/2 z-[151] w-full max-w-lg px-4"
            >
              <div className="glass-card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b"
                  style={{ borderColor:'var(--card-border)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" style={{ color:'var(--text-3)', flexShrink:0 }}>
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input ref={ref} value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Keresés piacok között..."
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                    style={{ color:'var(--text-1)' }}
                  />
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background:'var(--bg-raised)', border:'1px solid var(--card-border)', color:'var(--text-3)' }}>
                    ESC
                  </kbd>
                </div>

                <div className="py-1.5 max-h-72 overflow-y-auto">
                  {results.length === 0 && (
                    <p className="px-4 py-8 text-sm text-center" style={{ color:'var(--text-3)' }}>
                      Nincs találat
                    </p>
                  )}
                  {results.map((item, i) => (
                    <button key={i} onClick={() => go(item.to)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5">
                      <span className="w-6 text-center flex-shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color:'var(--text-1)' }}>{item.label}</p>
                        <p className="text-xs truncate" style={{ color:'var(--text-3)' }}>{item.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
