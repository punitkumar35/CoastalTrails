import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { easeEmphasis } from '../../lib/motion';

export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: 0.48, delay, ease: easeEmphasis }}
    >
      {children}
    </motion.div>
  );
}
