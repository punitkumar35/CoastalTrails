import { Icon } from '@iconify/react';
import { cn } from '../../lib/cn';

export function Rating({ value, count, className }: { value: number; count?: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="font-display text-base font-semibold text-ember">{value.toFixed(2)}</span>
      <div className="flex items-center gap-0.5 text-gold" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <Icon key={i} icon="lucide:star" className={cn('h-3.5 w-3.5', i < Math.round(value) ? 'fill-current' : 'fill-none opacity-40')} />
        ))}
      </div>
      {count !== undefined ? <span className="text-xs text-ink-3">({count})</span> : null}
    </div>
  );
}
