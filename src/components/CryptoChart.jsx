import { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, ColorType } from 'lightweight-charts';

const BINANCE_INTERVALS = {
  '1p': '1m', '5p': '5m', '15p': '15m',
  '1ó': '1h', '4ó': '4h', '1n': '1d',
};

const CRYPTO_COLORS = {
  BTC: '#f7931a', ETH: '#627eea', SOL: '#9945ff', BNB: '#f3ba2f',
};

const BINANCE_SYMBOLS = {
  BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT', BNB: 'BNBUSDT',
};

export default function CryptoChart({ symbol = 'BTC' }) {
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volSeriesRef = useRef(null);
  const [tf, setTf] = useState('1ó');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const color = CRYPTO_COLORS[symbol] || '#818cf8';
  const binanceSymbol = BINANCE_SYMBOLS[symbol] || 'BTCUSDT';

  // Chart létrehozása
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(100,116,139,0.1)' },
        horzLines: { color: 'rgba(100,116,139,0.1)' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#64748b', width: 1, style: 2 },
        horzLine: { color: '#64748b', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: 'rgba(100,116,139,0.2)',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: 'rgba(100,116,139,0.2)',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      width: container.clientWidth,
      height: 320,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });

    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volSeriesRef.current = volSeries;

    const handleResize = () => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Adatok betöltése időtáv / kripto változáskor
  useEffect(() => {
    const interval = BINANCE_INTERVALS[tf] || '1h';
    const limit = tf === '1n' ? 90 : 60;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [klinesRes, ticker24Res] = await Promise.all([
          fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`),
          fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`),
        ]);
        const klines = await klinesRes.json();
        const ticker = await ticker24Res.json();
        if (cancelled || !Array.isArray(klines)) return;

        const candles = klines.map(k => ({
          time: Math.floor(k[0] / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
        }));

        const volumes = klines.map(k => ({
          time: Math.floor(k[0] / 1000),
          value: parseFloat(k[5]),
          color: parseFloat(k[4]) >= parseFloat(k[1])
            ? `${color}88`
            : '#ef444488',
        }));

        candleSeriesRef.current?.setData(candles);
        volSeriesRef.current?.setData(volumes);
        chartRef.current?.timeScale().fitContent();

        const last = candles[candles.length - 1];
        const chg = parseFloat(ticker.priceChangePercent);
        setStats({
          price: last.close,
          change: chg,
          high: parseFloat(ticker.highPrice),
          low: parseFloat(ticker.lowPrice),
          vol: parseFloat(ticker.volume),
        });
      } catch (e) {
        console.error('CryptoChart hiba:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const id = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [tf, binanceSymbol, color]);

  const fmtPrice = (p) => p >= 1000
    ? p.toLocaleString('hu-HU', { maximumFractionDigits: 2 })
    : p.toFixed(4);

  return (
    <div className="mb-4 rounded-2xl border border-surface-700 overflow-hidden bg-surface-950/80 backdrop-blur-sm">

      {/* Fejléc – ár + statisztika */}
      <div className="px-4 pt-4 pb-3 border-b border-surface-700">
        {stats ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold text-white">
                  ${fmtPrice(stats.price)}
                </span>
                <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                  stats.change >= 0
                    ? 'bg-green-900/40 text-green-400'
                    : 'bg-red-900/40 text-red-400'
                }`}>
                  {stats.change >= 0 ? '+' : ''}{stats.change.toFixed(2)}%
                </span>
                <span className="text-xs text-gray-500">24ó</span>
              </div>
              <div className="flex gap-4 text-xs text-gray-400">
                <span>Min <span className="text-gray-200">${fmtPrice(stats.low)}</span></span>
                <span>Max <span className="text-gray-200">${fmtPrice(stats.high)}</span></span>
                <span>Vol <span className="text-gray-200">{stats.vol.toLocaleString('hu-HU', { maximumFractionDigits: 0 })} {symbol}</span></span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-400 font-medium">{symbol}/USDT</span>
            </div>
          </div>
        ) : (
          <div className="h-10 flex items-center">
            <div className="w-32 h-6 bg-surface-700 rounded animate-pulse" />
          </div>
        )}
      </div>

      {/* Időtáv-választó */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-surface-700">
        {Object.keys(BINANCE_INTERVALS).map(label => (
          <button
            key={label}
            onClick={() => setTf(label)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150 ${
              tf === label
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            style={tf === label ? { backgroundColor: color + '33', color } : {}}
          >
            {label}
          </button>
        ))}
        {loading && (
          <span className="ml-auto text-xs text-gray-600 animate-pulse">frissítés...</span>
        )}
      </div>

      {/* Gyertyás grafikon */}
      <div className="relative">
        <div ref={containerRef} />
      </div>
    </div>
  );
}
