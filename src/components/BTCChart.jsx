import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries, ColorType } from 'lightweight-charts';

export default function BTCChart() {
  const chartContainerRef = useRef(null);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      width: container.clientWidth,
      height: 300,
      crosshair: { mode: 1 },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#334155',
      },
      rightPriceScale: { borderColor: '#334155' },
    });

    // v5 API: addSeries(SeriesType, options)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: '#818cf8',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const fetchData = async () => {
      try {
        const res = await fetch(
          'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=60'
        );
        const raw = await res.json();
        if (!Array.isArray(raw)) return;

        const candleData = raw.map(k => ({
          time: Math.floor(k[0] / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
        }));
        const lineData = raw.map(k => ({
          time: Math.floor(k[0] / 1000),
          value: parseFloat(k[4]),
        }));

        candleSeries.setData(candleData);
        lineSeries.setData(lineData);
        chart.timeScale().fitContent();
      } catch (e) {
        console.error('BTCChart hiba:', e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);

    const handleResize = () => {
      if (chartContainerRef.current)
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  return (
    <div className="mb-2">
      <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">BTC/USDT – 1 perc</p>
      <div
        ref={chartContainerRef}
        className="w-full h-[300px] rounded-xl overflow-hidden border border-surface-700"
      />
    </div>
  );
}
