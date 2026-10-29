import type { ComponentProps } from 'react';
import { cn } from './cn';

const variants = {
  info: 'border-border bg-muted',
  success: 'border-success/40 bg-success/10 text-success',
  danger: 'border-danger/40 bg-danger/10 text-danger',
};

export function Alert({
  variant = 'info',
  className,
  ...props
}: ComponentProps<'div'> & { variant?: keyof typeof variants }) {
  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      className={cn('border px-3 py-2 text-sm', variants[variant], className)}
      {...props}
    />
  );
}
