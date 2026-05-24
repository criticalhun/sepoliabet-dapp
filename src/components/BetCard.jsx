import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function BetCard({ market, index }) {
  const totalPool = parseFloat(market.totalYesAmount) + parseFloat(market.totalNoAmount);
  const yesPercent = totalPool > 0 ? (parseFloat(market.totalYesAmount) / totalPool * 100).toFixed(0) : 50;
  const noPercent = totalPool > 0 ? (parseFloat(market.totalNoAmount) / totalPool * 100).toFixed(0) : 50;
  const endDate = new Date(market.endTime * 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -4, boxShadow: '0 10px 30px rgba(99,102,241,0.2)' }}
      className="glass-card p-5 border border-transparent hover:border-brand-500/30 transition-all duration-300"
    >
      <Link to={`/market/${market.id}`} className="block">
        <h3 className="font-semibold text-base mb-3 text-white leading-snug">{market.question}</h3>
        <div className="flex justify-between items-center text-xs text-gray-400 mb-4">
          <span className="bg-surface-800/80 rounded-full px-2 py-1">{totalPool.toFixed(4)} ETH</span>
          <span>{endDate.toLocaleDateString()} {endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div className="flex gap-2">
          <span className="flex-1 text-center bg-green-900/20 text-green-400 py-1 rounded-lg text-xs font-medium border border-green-800/30">
            IGEN {yesPercent}%
          </span>
          <span className="flex-1 text-center bg-red-900/20 text-red-400 py-1 rounded-lg text-xs font-medium border border-red-800/30">
            NEM {noPercent}%
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
