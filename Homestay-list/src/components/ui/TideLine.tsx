import { motion, useScroll, useSpring } from 'motion/react';

export function TideLine() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return <motion.div className="tide-line" style={{ scaleX }} aria-hidden="true" />;
}
