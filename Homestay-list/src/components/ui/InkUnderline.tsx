import { motion } from 'motion/react';
import { cn } from '../../lib/cn';

export function InkUnderline({ className, delay = 0, color = 'var(--c-ember)' }: { className?: string; delay?: number; color?: string }) {
  return (
    <svg
      viewBox="0 0 240 16"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn('pointer-events-none absolute -bottom-2 left-0 h-3 w-full', className)}
    >
      <motion.path
        d="M6 10 C 32 4, 60 13, 92 8 C 122 4, 150 13, 182 8 C 202 5, 222 8, 234 9"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.9, delay, ease: 'easeInOut' }}
      />
    </svg>
  );
}
