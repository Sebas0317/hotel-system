import { motion } from 'framer-motion';

export function Skeleton({ className = '', ...props }) {
  return (
    <motion.div
      animate={{ opacity: [0.5, 0.7, 0.5] }}
      transition={{ repeat: Infinity, duration: 1.5 }}
      className={`animate-pulse rounded-md bg-gray-200 ${className}`.trim()}
      {...props}
    />
  );
}
