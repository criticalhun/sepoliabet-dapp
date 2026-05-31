import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Ctx = createContext({ success:()=>{}, error:()=>{}, info:()=>{}, warning:()=>{} });

const CFG = {
  success: { icon:'✓', from:'from-emerald-500/20', border:'border-emerald-500/25', text:'text-emerald-300' },
  error:   { icon:'✕', from:'from-rose-500/20',    border:'border-rose-500/25',    text:'text-rose-300'    },
  info:    { icon:'ℹ', from:'from-brand-500/20',   border:'border-brand-500/25',   text:'text-brand-300'   },
  warning: { icon:'⚠', from:'from-amber-500/20',   border:'border-amber-500/25',   text:'text-amber-300'   },
};

function ToastItem({ t, onClose }) {
  const c = CFG[t.type] || CFG.info;
  return (
    <motion.div
      initial={{ opacity:0, x:60, scale:0.92 }}
      animate={{ opacity:1, x:0, scale:1 }}
      exit={{ opacity:0, x:60, scale:0.92 }}
      transition={{ type:'spring', stiffness:320, damping:26 }}
      onClick={onClose}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl glass border
        bg-gradient-to-r ${c.from} to-transparent ${c.border} cursor-pointer shadow-2xl`}
    >
      <span className={`text-base font-bold flex-shrink-0 ${c.text}`}>{c.icon}</span>
      <p className={`text-sm font-medium flex-1 ${c.text}`}>{t.msg}</p>
    </motion.div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), []);

  const add = useCallback((msg, type, dur = 4500) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p.slice(-4), { id, msg, type }]);
    setTimeout(() => remove(id), dur);
  }, [remove]);

  return (
    <Ctx.Provider value={{
      success: (m,d) => add(m,'success',d),
      error:   (m,d) => add(m,'error',d),
      info:    (m,d) => add(m,'info',d),
      warning: (m,d) => add(m,'warning',d),
    }}>
      {children}
      <div className="fixed top-[4.5rem] right-3 z-[200] flex flex-col gap-2 w-72 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem t={t} onClose={() => remove(t.id)} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
