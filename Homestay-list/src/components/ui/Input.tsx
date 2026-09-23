import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/cn';

const fieldBase =
  'w-full rounded-xl border border-line-2 bg-elevated px-4 text-ink placeholder:text-ink-3 transition-colors duration-micro focus:border-tide focus:outline-none focus:ring-2 focus:ring-tide/30';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn('h-11', fieldBase, className)} {...props} />;
});
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn('min-h-[96px] resize-y py-3', fieldBase, className)} {...props} />;
});
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn('h-11 appearance-none pr-9', fieldBase, className)} {...props}>
      {children}
    </select>
  );
});
Select.displayName = 'Select';

export function SearchField({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
      <input className={cn('h-11 pl-10', fieldBase)} {...props} />
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-err">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-ink-3">{hint}</span>
      ) : null}
    </label>
  );
}
