import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export default function GlassCard({ children, className, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(99,102,241,0.2)' }}
      className={cn("glass-card p-6", className)}
    >
      {children}
    </motion.div>
  );
}
