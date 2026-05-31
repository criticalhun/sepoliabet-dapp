import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLiveFeed } from '../hooks/useLiveFeed';

function ago(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)   return `${s}mp`;
  if (s < 3600) return `${Math.floor(s/60)}p`;
  return `${Math.floor(s/3600)}ó`;
}

export default function LiveFeed() {
  const feed = useLiveFeed();
  if (!feed.length) return null;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color:'var(--text-2)' }}>
          Élő fogadások
        </h3>
      </div>
      <div className="space-y-0.5 max-h-56 overflow-y-auto scrollbar-none">
        <AnimatePresence initial={false}>
          {feed.map(item => (
            <motion.div key={item.id}
              initial={{ opacity:0, height:0, y:-8 }}
              animate={{ opacity:1, height:'auto', y:0 }}
              transition={{ duration:0.2 }}
            >
              <Link to={`/market/${item.marketId}`}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors">
                <span className={`text-xs font-bold flex-shrink-0 ${item.outcome ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {item.outcome ? '📈' : '📉'}
                </span>
                <span className="text-xs font-mono flex-shrink-0" style={{ color:'var(--text-2)' }}>
                  {item.address.slice(0,6)}…
                </span>
                <span className="text-xs font-bold font-mono text-brand-400 flex-shrink-0">
                  {item.amount} ETH
                </span>
                <span className="text-xs ml-auto flex-shrink-0 tabular-nums" style={{ color:'var(--text-3)' }}>
                  #{item.marketId} · {ago(item.time)}
                </span>
                {item.live && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
                )}
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
