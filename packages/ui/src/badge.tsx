import type { ComponentProps } from 'react';
import { cn } from './cn';

const variants = {
  neutral: 'border-border text-muted-foreground',
  accent: 'border-accent/40 text-accent',
  success: 'border-success/40 text-success',
  danger: 'border-danger/40 text-danger',
};

export function Badge({
  variant = 'neutral',
  className,
  ...props
}: ComponentProps<'span'> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn(
        'inline-flex items-center border px-1.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
