import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Market from './pages/Market';
import CreateMarket from './pages/CreateMarket';
import NotFound from './pages/NotFound';

function App() {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#020617] text-white">
      {/* CSS alapú háttér – sokkal gyorsabb mint a canvas */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/5 rounded-full blur-3xl" />
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

export default App;