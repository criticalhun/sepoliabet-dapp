import { motion } from 'framer-motion';

export default function AnimatedCard({ children, className = '' }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(99, 102, 241, 0.3)' }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`glass-card p-5 transition-colors duration-200 ${className}`}
    >
      {children}
    </motion.div>
  );
}
