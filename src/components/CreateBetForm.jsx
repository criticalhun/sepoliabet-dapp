import { useState } from 'react';
import { createMarket } from '../services/contractService';
import GlassCard from './GlassCard';
import GradientButton from './GradientButton';
import Spinner from './Spinner';

export default function CreateBetForm() {
  const [question, setQuestion] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
    if (!question || !endTimestamp || endTimestamp <= Date.now() / 1000) return;
    setLoading(true);
    try {
      const tx = await createMarket(question, endTimestamp);
      alert('Piac létrehozva! Tx: ' + tx.hash);
      setQuestion('');
      setEndDate('');
    } catch (err) {
      alert('Hiba: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6 gradient-text">Új piac</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Kérdés (igen/nem)</label>
          <input
            className="w-full bg-surface-800 border border-surface-600 rounded-lg py-2 px-3 text-white"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Pl. Megnyeri-e X a választást?"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Lejárat dátuma</label>
          <input
            type="datetime-local"
            className="w-full bg-surface-800 border border-surface-600 rounded-lg py-2 px-3 text-white"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <GradientButton type="submit" disabled={loading} className="w-full">
          {loading ? <Spinner /> : 'Piac létrehozása'}
        </GradientButton>
      </form>
    </GlassCard>
  );
}
