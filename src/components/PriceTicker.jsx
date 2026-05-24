import { useState, useEffect, useRef } from 'react';

const SYMBOLS = [
  { key: 'BTCUSDT', label: 'BTC', color: '#f7931a' },
  { key: 'ETHUSDT', label: 'ETH', color: '#627eea' },
  { key: 'SOLUSDT', label: 'SOL', color: '#9945ff' },
  { key: 'BNBUSDT', label: 'BNB', color: '#f3ba2f' },
];

export default function PriceTicker() {
  const [prices, setPrices] = useState({});
  const prevRef = useRef({});
  const [flash, setFlash] = useState({});

  const fetchPrices = async () => {
    try {
      const results = await Promise.all(
        SYMBOLS.map(s =>
          fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${s.key}`).then(r => r.json())
        )
      );
      const next = {};
      const newFlash = {};
      results.forEach((r, i) => {
        const key = SYMBOLS[i].key;
        const price = parseFloat(r.lastPrice);
        const prev = prevRef.current[key];
        if (prev !== undefined && price !== prev) {
          newFlash[key] = price > prev ? 'up' : 'down';
        }
        next[key] = { price, change: parseFloat(r.priceChangePercent) };
      });
      prevRef.current = Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v.price]));
      setPrices(next);
      if (Object.keys(newFlash).length) {
        setFlash(newFlash);
        setTimeout(() => setFlash({}), 600);
      }
    } catch {}
  };

  useEffect(() => {
    fetchPrices();
    const id = setInterval(fetchPrices, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden lg:flex items-center gap-5">
      {SYMBOLS.map(({ key, label, color }) => {
        const d = prices[key];
        const f = flash[key];
        const isUp = d?.change >= 0;
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span className="text-xs font-medium" style={{ color }}>{label}</span>
            <span
              className="mono text-xs font-medium transition-colors duration-300"
              style={{
                color: f === 'up' ? '#4ade80' : f === 'down' ? '#f87171' : '#cbd5e1',
              }}
            >
              {d ? `$${d.price.toLocaleString('en-US', { maximumFractionDigits: d.price > 100 ? 2 : 4 })}` : '—'}
            </span>
            {d && (
              <span className={isUp ? 'tag-up' : 'tag-down'}>
                {isUp ? '+' : ''}{d.change.toFixed(2)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
