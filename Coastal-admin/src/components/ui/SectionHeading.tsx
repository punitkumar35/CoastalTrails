import { cn } from '../../lib/cn';

interface SectionHeadingProps {
  overline?: string;
  title: string;
  lede?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeading({ overline, title, lede, align = 'left', className }: SectionHeadingProps) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {overline ? <p className="overline mb-3">{overline}</p> : null}
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {lede ? <p className="mt-4 text-base leading-relaxed text-ink-2">{lede}</p> : null}
    </div>
  );
}
