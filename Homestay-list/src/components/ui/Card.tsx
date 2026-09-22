import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-line bg-elevated', className)} {...props} />;
}

export function ElevatedCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-line bg-elevated elevated', className)} {...props} />;
}

export interface ListingCardProps extends HTMLAttributes<HTMLDivElement> {
  image?: string;
  imageAlt?: string;
  ratio?: string;
}

export function ListingCard({ image, imageAlt, ratio = 'aspect-[4/3]', className, children, ...props }: ListingCardProps) {
  return (
    <div className={cn('group overflow-hidden rounded-2xl border border-line bg-elevated', className)} {...props}>
      {image ? (
        <div className={cn('overflow-hidden bg-paper-2', ratio)}>
          <img
            src={image}
            alt={imageAlt ?? ''}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-emphasis group-hover:scale-[1.04]"
          />
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  );
}
