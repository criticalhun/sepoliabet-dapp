import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Toast({ message, type = 'success', onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-800/90' : 'bg-red-800/90';
  const icon = type === 'success' ? '✓' : '✗';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg shadow-lg text-white flex items-center gap-3 ${bgColor} backdrop-blur-md`}
        >
          <span className="text-xl">{icon}</span>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
