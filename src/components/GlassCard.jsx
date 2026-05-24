import { motion } from 'framer-motion';

export default function GlassCard({ children, className = '', delay = 0, hover = true }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={hover ? { y: -2, borderColor: 'rgba(255,255,255,0.14)' } : {}}
      className={`card-elevated p-5 transition-colors duration-200 ${className}`}
    >
      {children}
    </motion.div>
  );
}
