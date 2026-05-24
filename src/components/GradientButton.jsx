import { motion } from 'framer-motion';

export default function GradientButton({ children, className = '', disabled, color, ...props }) {
  const bg = color
    ? `${color}22`
    : 'rgba(99,102,241,0.15)';
  const border = color || '#6366f1';

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      disabled={disabled}
      style={{
        background: bg,
        borderColor: border + '66',
        color: border === '#6366f1' ? '#a5b4fc' : color,
      }}
      className={`w-full py-3 rounded-xl border font-semibold text-sm transition-all duration-200
        disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
