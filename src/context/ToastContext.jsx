import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastCtx = createContext(null);

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

const STYLES = {
  success: { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  color: '#4ade80' },
  error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  color: '#f87171' },
  info:    { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', color: '#a5b4fc' },
  warning: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', color: '#fbbf24' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info', duration = 4500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div style={{ position: 'fixed', top: 72, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AnimatePresence>
          {toasts.map(t => {
            const s = STYLES[t.type] || STYLES.info;
            return (
              <motion.div key={t.id}
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.95 }}
                transition={{ type: 'spring', damping: 20 }}
                style={{
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  borderRadius: 10,
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  minWidth: 260,
                  maxWidth: 360,
                  backdropFilter: 'blur(12px)',
                }}
              >
                <span style={{ color: s.color, fontWeight: 600, fontSize: 14 }}>{ICONS[t.type]}</span>
                <span style={{ color: '#e2e8f0', fontSize: 13, flex: 1 }}>{t.message}</span>
                <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                  style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>
                  ×
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
