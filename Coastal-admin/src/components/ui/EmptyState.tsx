import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  overline?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon, overline, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-2 bg-paper-2 px-6 py-16 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-tide-glow/15 text-tide">{icon}</div>
      ) : null}
      {overline ? <p className="overline mb-2">{overline}</p> : null}
      <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-sm text-ink-2">{description}</p> : null}
      {action ? (
        <Button className="mt-6" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
