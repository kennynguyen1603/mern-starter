import type { ComponentProps } from 'react';
import { cn } from './cn';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('border border-border bg-background p-6', className)}
      {...props}
    />
  );
}
