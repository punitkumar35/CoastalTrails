import type { Transition, Variants } from 'motion/react';

export const springFast = { type: 'spring', stiffness: 400, damping: 30 } satisfies Transition;
export const springSoft = { type: 'spring', stiffness: 260, damping: 26 } satisfies Transition;

export const easeOut: [number, number, number, number] = [0.2, 0, 0, 1];
export const easeEmphasis: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.48, ease: easeEmphasis } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.32, ease: easeOut } },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
