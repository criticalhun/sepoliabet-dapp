import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="text-center py-20">
      <h2 className="text-4xl font-bold mb-4">404 - Oldal nem található</h2>
      <Link to="/" className="text-blue-400 hover:underline">Vissza a főoldalra</Link>
    </div>
  );
}
