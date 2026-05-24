import { Link, useLocation } from 'react-router-dom';
import WalletConnect from './WalletConnect';
import PriceTicker from './PriceTicker';
import { motion } from 'framer-motion';

export default function Header() {
  const loc = useLocation();
  const links = [
    { to: '/', label: 'Piacok' },
  ];

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        background: 'rgba(2,6,23,0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      className="sticky top-0 z-50"
    >
      {/* Felső sáv – logo + ticker + wallet */}
      <div className="container mx-auto flex items-center justify-between px-4 h-14 gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <span className="text-white font-bold text-xs">SB</span>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight hidden sm:block">
            SepoliaBet
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded text-indigo-400 border border-indigo-800 font-medium hidden sm:block">
            TESTNET
          </span>
        </Link>

        <PriceTicker />

        <div className="flex items-center gap-3 shrink-0">
          {links.map(l => (
            <Link key={l.to} to={l.to}
              className="text-xs font-medium uppercase tracking-wider transition-colors"
              style={{ color: loc.pathname === l.to ? '#e2e8f0' : '#475569' }}
            >
              {l.label}
            </Link>
          ))}
          <WalletConnect />
        </div>
      </div>
    </motion.header>
  );
}
