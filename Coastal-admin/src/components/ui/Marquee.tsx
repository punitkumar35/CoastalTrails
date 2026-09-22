import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Marquee({ children, className, speed = '28s' }: { children: ReactNode; className?: string; speed?: string }) {
  return (
    <div className={cn('marquee-mask overflow-hidden', className)}>
      <div className="animate-marquee flex w-max" style={{ animationDuration: speed }}>
        <div className="flex shrink-0 items-center gap-8 pr-8">{children}</div>
        <div className="flex shrink-0 items-center gap-8 pr-8" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
