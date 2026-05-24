import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Market from './pages/Market';
import NotFound from './pages/NotFound';
import AnimatedBackground from './components/AnimatedBackground';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#020617' }}>
      <AnimatedBackground />
      <Header />
      <main className="flex-grow relative z-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/market/:id" element={<Market />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
