import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const COINS = [
  { sym:'BTC', pair:'BTCUSDT', color:'#f7931a', icon:'₿' },
  { sym:'ETH', pair:'ETHUSDT', color:'#627eea', icon:'Ξ' },
  { sym:'SOL', pair:'SOLUSDT', color:'#9945ff', icon:'◎' },
  { sym:'BNB', pair:'BNBUSDT', color:'#f3ba2f', icon:'⬡' },
];

export default function PriceTicker() {
  const [prices, setPrices] = useState({});

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbols=[${
            COINS.map(c => `"${c.pair}"`).join(',')
          }]`
        );
        const data = await res.json();
        const p = {};
        data.forEach(t => {
          const coin = COINS.find(c => c.pair === t.symbol);
          if (coin) p[coin.sym] = {
            price:  parseFloat(t.lastPrice),
            change: parseFloat(t.priceChangePercent),
          };
        });
        setPrices(p);
      } catch {}
    };
    fetch_();
    const id = setInterval(fetch_, 30000);
    return () => clearInterval(id);
  }, []);

  const ready = COINS.filter(c => prices[c.sym]);
  if (!ready.length) return null;

  return (
    <div className="border-b" style={{ borderColor:'var(--card-border)', background:'var(--card-bg)' }}>
      <div className="container mx-auto px-4 flex items-center gap-6 py-1.5 overflow-x-auto scrollbar-none">
        {ready.map(coin => {
          const { price, change } = prices[coin.sym];
          const up = change >= 0;
          return (
            <motion.div
              key={coin.sym}
              initial={{ opacity:0 }} animate={{ opacity:1 }}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <span className="text-xs font-bold" style={{ color:coin.color }}>
                {coin.icon} {coin.sym}
              </span>
              <span className="text-xs font-mono font-semibold" style={{ color:'var(--text-1)' }}>
                ${price >= 1000
                  ? price.toLocaleString('en-US', { maximumFractionDigits:2 })
                  : price.toFixed(4)}
              </span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                up ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}>
                {up ? '+':''}{change.toFixed(2)}%
              </span>
            </motion.div>
          );
        })}
        <div className="ml-auto flex-shrink-0 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs" style={{ color:'var(--text-3)' }}>Live</span>
        </div>
      </div>
    </div>
  );
}
