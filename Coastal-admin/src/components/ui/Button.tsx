import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'icon';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-micro active:scale-[0.97] select-none disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  primary: 'bg-tide text-white hover:bg-tide-2',
  secondary: 'bg-elevated text-ink border border-line-2 hover:border-tide hover:text-tide',
  ghost: 'text-ink-2 hover:text-ink hover:bg-paper-2',
  icon: 'bg-elevated text-ink border border-line-2 hover:border-tide hover:text-tide rounded-full',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-lg',
  md: 'h-11 px-5 text-sm rounded-xl',
  lg: 'h-12 px-6 text-base rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  const dim = variant === 'icon' ? 'h-11 w-11 shrink-0' : sizes[size];
  return <button ref={ref} type={type} className={cn(base, variants[variant], dim, className)} {...props} />;
});
Button.displayName = 'Button';
