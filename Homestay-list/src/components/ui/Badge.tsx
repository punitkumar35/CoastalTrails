import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'solid' | 'outline' | 'dot' | 'warm';

const variants: Record<Variant, string> = {
  solid: 'bg-tide text-white',
  outline: 'border border-line-2 text-ink-2',
  dot: 'bg-tide-glow/20 text-tide',
  warm: 'bg-ember/10 text-ember',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ variant = 'outline', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.14em]',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
