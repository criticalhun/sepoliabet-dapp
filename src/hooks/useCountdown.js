import { useState, useEffect } from 'react';

export function useCountdown(endTime) {
  const calc = () => Math.max(0, endTime - Math.floor(Date.now() / 1000));
  const [secs, setSecs] = useState(calc);

  useEffect(() => {
    setSecs(calc());
    const id = setInterval(() => setSecs(calc()), 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return secs;
}

export function fmtCountdown(secs) {
  if (secs <= 0) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h >= 24) return `${Math.floor(h/24)}n ${h%24}ó`;
  if (h > 0)   return `${h}ó ${String(m).padStart(2,'0')}p`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
