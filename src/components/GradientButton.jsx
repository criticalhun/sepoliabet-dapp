import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export default function GradientButton({ children, className, disabled, ...props }) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      disabled={disabled}
      className={cn("btn-primary", className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
