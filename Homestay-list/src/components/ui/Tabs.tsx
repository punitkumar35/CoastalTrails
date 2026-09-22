import { motion } from 'motion/react';
import { cn } from '../../lib/cn';
import { springSoft } from '../../lib/motion';

export interface TabItem {
  id: string;
  label: string;
}

export function Tabs({
  items,
  active,
  onChange,
  className,
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn('inline-flex items-center gap-1 rounded-full border border-line bg-paper-2 p-1', className)}
      role="tablist"
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-micro',
              isActive ? 'text-white' : 'text-ink-2 hover:text-ink',
            )}
          >
            {isActive ? (
              <motion.span layoutId="tabs-indicator" transition={springSoft} className="absolute inset-0 rounded-full bg-tide" />
            ) : null}
            <span className="relative z-10">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
