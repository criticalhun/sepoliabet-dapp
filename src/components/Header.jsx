import { Link } from 'react-router-dom';
import WalletConnect from './WalletConnect';
import { motion } from 'framer-motion';

export default function Header() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 glass border-b border-white/5 shadow-sm"
    >
      <div className="container mx-auto flex items-center justify-between px-3 md:px-4 py-3">
        <Link to="/" className="text-xl md:text-2xl font-bold gradient-text tracking-tight">
          SepoliaBet
        </Link>
        <nav className="flex items-center space-x-2 md:space-x-6">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors duration-200 text-xs md:text-sm font-medium uppercase tracking-wider">Piaci lista</Link>
          <Link to="/create" className="text-gray-400 hover:text-white transition-colors duration-200 text-xs md:text-sm font-medium uppercase tracking-wider">Létrehozás</Link>
          <WalletConnect />
        </nav>
      </div>
    </motion.header>
  );
}
