import type { ComponentProps } from 'react';
import { cn } from './cn';

const variants = {
  primary: 'bg-accent text-accent-foreground hover:bg-accent/90',
  secondary: 'border border-border bg-background hover:bg-muted',
  ghost: 'hover:bg-muted',
  danger: 'bg-danger text-white hover:bg-danger/90',
};

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
};

type ButtonVariantProps = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
};

/** Button classes, reusable on links: `<Link className={buttonVariants()} />`. */
export function buttonVariants({
  variant = 'primary',
  size = 'md',
  className,
}: ButtonVariantProps = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    'disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<'button'> & ButtonVariantProps) {
  return (
    <button
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}
