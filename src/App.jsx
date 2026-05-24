import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Market from './pages/Market';
import CreateMarket from './pages/CreateMarket';
import NotFound from './pages/NotFound';

function App() {
  return (
    <div className="relative min-h-screen flex flex-col bg-gray-900 text-white">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 relative z-10">
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

