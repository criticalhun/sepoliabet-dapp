import { Routes, Route } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Market from './pages/Market';
import CreateMarket from './pages/CreateMarket';
import NotFound from './pages/NotFound';

export default function App() {
  const { theme } = useTheme();
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)', color: 'var(--text-1)' }}>
      {/* Háttér gradiens */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {theme === 'dark' ? (
          <>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(139,92,246,0.05) 0%, transparent 60%)' }} />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(139,92,246,0.05) 0%, transparent 60%)' }} />
        )}
      </div>
      <Header />
      <main className="flex-grow container mx-auto px-4 py-6 relative z-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/market/:id" element={<Market />} />
          <Route path="/create" element={<CreateMarket />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
