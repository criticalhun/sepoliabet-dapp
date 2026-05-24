import { useState } from 'react';
import { createMarket } from '../services/contractService';

export default function CreateMarket() {
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
    <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Új piac</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Kérdés</label>
          <input className="w-full p-2 rounded bg-gray-700 border border-gray-600" value={question} onChange={(e) => setQuestion(e.target.value)} required />
        </div>
        <div>
          <label className="block mb-1">Lejárat</label>
          <input type="datetime-local" className="w-full p-2 rounded bg-gray-700 border border-gray-600" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
        <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
          {loading ? 'Létrehozás...' : 'Piac létrehozása'}
        </button>
      </form>
    </div>
  );
}
