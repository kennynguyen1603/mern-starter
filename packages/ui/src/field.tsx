import type { ReactNode } from 'react';
import { cn } from './cn';

type FieldProps = {
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

/** Label + control + error message. Wrapping in <label> associates them. */
export function Field({ label, error, className, children }: FieldProps) {
  return (
    <label className={cn('grid gap-1.5', className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  );
}
