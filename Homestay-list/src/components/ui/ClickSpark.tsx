import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const STAR_PATH =
  'M12 1.5 C 13.2 7.5, 16.5 10.8, 22.5 12 C 16.5 13.2, 13.2 16.5, 12 22.5 C 10.8 16.5, 7.5 13.2, 1.5 12 C 7.5 10.8, 10.8 7.5, 12 1.5 Z';

export function ClickSpark() {
  const reduced = useReducedMotion();
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    if (reduced) return;
    let counter = 0;
    function onDown(e: PointerEvent) {
      const id = ++counter;
      setBursts((b) => [...b.slice(-6), { id, x: e.clientX, y: e.clientY }]);
      window.setTimeout(() => setBursts((b) => b.filter((s) => s.id !== id)), 650);
    }
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [reduced]);

  if (reduced) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-palette overflow-hidden" aria-hidden="true">
      <AnimatePresence>
        {bursts.map((b) => (
          <motion.svg
            key={b.id}
            viewBox="0 0 24 24"
            initial={{ x: b.x - 9, y: b.y - 9, scale: 0.2, rotate: -30, opacity: 0.95 }}
            animate={{ scale: 1.15, rotate: 25, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="absolute left-0 top-0 h-[18px] w-[18px] text-ember"
          >
            <path d={STAR_PATH} fill="currentColor" />
          </motion.svg>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
