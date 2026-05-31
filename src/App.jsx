import { Routes, Route } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';
import Header from './components/Header';
import Footer from './components/Footer';
import PriceTicker from './components/PriceTicker';
import MobileNav from './components/MobileNav';
import Home from './pages/Home';
import Market from './pages/Market';
import CreateMarket from './pages/CreateMarket';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

export default function App() {
  const { theme } = useTheme();
  return (
    <div className="min-h-screen flex flex-col"
      style={{ background:'var(--bg-base)', color:'var(--text-1)' }}>
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div style={{
          position:'absolute', inset:0,
          background: theme==='dark'
            ? 'radial-gradient(ellipse at 20% 0%,rgba(99,102,241,0.07) 0%,transparent 55%), radial-gradient(ellipse at 80% 100%,rgba(139,92,246,0.05) 0%,transparent 55%)'
            : 'radial-gradient(ellipse at 20% 0%,rgba(99,102,241,0.06) 0%,transparent 55%)'
        }} />
      </div>
      <Header />
      <PriceTicker />
      <main className="flex-grow container mx-auto px-4 py-6 relative z-10">
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/market/:id"  element={<Market />} />
          <Route path="/create"      element={<CreateMarket />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile"     element={<Profile />} />
          <Route path="*"            element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
