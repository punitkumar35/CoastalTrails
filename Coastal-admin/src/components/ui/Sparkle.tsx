import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/cn';

const STAR_PATH =
  'M12 1.5 C 13.2 7.5, 16.5 10.8, 22.5 12 C 16.5 13.2, 13.2 16.5, 12 22.5 C 10.8 16.5, 7.5 13.2, 1.5 12 C 7.5 10.8, 10.8 7.5, 12 1.5 Z';

export function TwinkleSparkle({ className, delay = 0 }: { className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('text-gold', className)}>
        <path d={STAR_PATH} fill="currentColor" />
      </svg>
    );
  }
  return (
    <motion.span
      className={cn('inline-block', className)}
      initial={{ scale: 0, rotate: -40, opacity: 0 }}
      whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', stiffness: 260, damping: 14, delay }}
      aria-hidden="true"
    >
      <motion.svg
        viewBox="0 0 24 24"
        className="h-full w-full text-gold"
        animate={{ scale: [1, 0.82, 1], opacity: [1, 0.5, 1], rotate: [0, 10, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay }}
      >
        <path d={STAR_PATH} fill="currentColor" />
      </motion.svg>
    </motion.span>
  );
}
