export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      className="py-4 mt-8">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <span className="text-xs text-slate-600">SepoliaBet © 2026 – Testnet only</span>
        <span className="text-xs text-slate-700 mono">Sepolia ETH</span>
      </div>
    </footer>
  );
}
