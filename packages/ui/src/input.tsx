import type { ComponentProps } from 'react';
import { cn } from './cn';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-10 w-full border border-border bg-background px-3 text-sm',
        'placeholder:text-muted-foreground',
        'focus:border-accent focus:outline-none',
        'aria-invalid:border-danger disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
