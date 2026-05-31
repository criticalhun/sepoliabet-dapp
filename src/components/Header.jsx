import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import WalletConnect from './WalletConnect';
import CommandPalette from './CommandPalette';

const LANGS = [
  { code:'en', label:'English',    flag:'🇬🇧' },
  { code:'hu', label:'Magyar',     flag:'🇭🇺' },
  { code:'de', label:'Deutsch',    flag:'🇩🇪' },
  { code:'fr', label:'Français',   flag:'🇫🇷' },
  { code:'nl', label:'Nederlands', flag:'🇳🇱' },
];

export default function Header() {
  const { t, i18n }   = useTranslation();
  const { theme, toggle } = useTheme();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);
  const { pathname } = useLocation();
  const cur = LANGS.find(l => l.code === i18n.language) || LANGS[0];

  useEffect(() => {
    const h = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <motion.header initial={{ y:-16, opacity:0 }} animate={{ y:0, opacity:1 }}
      className="sticky top-0 z-40 glass border-b" style={{ borderColor:'var(--card-border)' }}>
      <div className="container mx-auto flex items-center justify-between px-4 h-14 gap-3">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-glow">
            <span className="text-white font-bold text-xs">S</span>
          </div>
          <span className="font-bold text-base gradient-text tracking-tight hidden sm:block">SepoliaBet</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {[
            { to:'/',            key:'nav.markets'     },
            { to:'/leaderboard', key:'nav.leaderboard' },
            { to:'/profile',     key:'nav.profile'     },
          ].map(item => (
            <Link key={item.to} to={item.to}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: pathname===item.to ? 'rgba(99,102,241,0.12)' : 'transparent',
                color:      pathname===item.to ? '#818cf8' : 'var(--text-2)',
              }}>
              {t(item.key)}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Command Palette */}
          <CommandPalette />

          {/* Theme toggle */}
          <button onClick={toggle} title={theme==='dark' ? t('theme.light') : t('theme.dark')}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
            style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)' }}>
            {theme === 'dark' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
              </svg>
            )}
          </button>

          {/* Language selector */}
          <div ref={langRef} className="relative">
            <button onClick={() => setLangOpen(o => !o)}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
              style={{ background:'var(--card-bg)', border:'1px solid var(--card-border)', color:'var(--text-2)' }}>
              <span className="text-base leading-none">{cur.flag}</span>
              <span className="hidden sm:block">{cur.code.toUpperCase()}</span>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"
                className={`text-gray-500 transition-transform ${langOpen ? 'rotate-180' : ''}`}>
                <path d="M4 6L0 2h8L4 6z"/>
              </svg>
            </button>

            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity:0, y:-6, scale:0.96 }}
                  animate={{ opacity:1, y:0, scale:1 }}
                  exit={{ opacity:0, y:-6, scale:0.96 }}
                  transition={{ duration:0.12 }}
                  className="absolute right-0 top-full mt-1.5 w-44 rounded-xl glass overflow-hidden z-50 shadow-2xl"
                  style={{ border:'1px solid var(--card-border)' }}
                >
                  {LANGS.map(lang => (
                    <button key={lang.code}
                      onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                      style={{
                        color: i18n.language===lang.code ? '#818cf8' : 'var(--text-2)',
                        background: i18n.language===lang.code ? 'rgba(99,102,241,0.08)' : 'transparent',
                      }}>
                      <span className="text-lg">{lang.flag}</span>
                      <span className="font-medium">{lang.label}</span>
                      {i18n.language===lang.code && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" className="ml-auto">
                          <path d="M2 6l3 3 5-5"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <WalletConnect />
        </div>
      </div>
    </motion.header>
  );
}
