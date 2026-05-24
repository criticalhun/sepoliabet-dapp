import { useMarkets } from '../hooks/useMarket';

export default function StatsPanel() {
  const { markets } = useMarkets();
  const totalVol = markets.reduce((a, m) =>
    a + parseFloat(m.totalYesAmount) + parseFloat(m.totalNoAmount), 0);
  const active = markets.filter(m => !m.resolved).length;
  const resolved = markets.filter(m => m.resolved).length;

  const items = [
    { label: 'Aktív piacok', value: active, color: '#6366f1' },
    { label: 'Lezárt piacok', value: resolved, color: '#475569' },
    { label: 'Teljes volumen', value: `${totalVol.toFixed(3)} ETH`, color: '#22c55e' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {items.map(({ label, value, color }) => (
        <div key={label} className="card px-4 py-3">
          <p className="label mb-1">{label}</p>
          <p className="mono text-base font-semibold" style={{ color }}>{value}</p>
        </div>
      ))}
    </div>
  );
}
