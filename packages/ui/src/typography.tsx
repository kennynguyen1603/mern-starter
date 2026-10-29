import type { ComponentProps } from 'react';
import { cn } from './cn';

/** Type scale — the single place heading styles are defined. */
const headings = {
  display: 'font-mono text-6xl font-semibold tracking-tighter',
  title: 'text-2xl font-semibold tracking-tight',
  subtitle: 'text-xl font-semibold tracking-tight',
  section: 'font-semibold',
  brand: 'text-sm font-semibold tracking-tight uppercase',
};

const texts = {
  muted: 'text-muted-foreground',
  description: 'text-sm text-muted-foreground',
};

type HeadingVariantProps = {
  variant?: keyof typeof headings;
  className?: string;
};

/** Heading classes, reusable on non-heading elements: `<Link className={headingVariants({ variant: 'brand' })} />`. */
export function headingVariants({
  variant = 'section',
  className,
}: HeadingVariantProps = {}) {
  return cn(headings[variant], className);
}

export function Heading({
  as: Tag = 'h2',
  variant,
  className,
  ...props
}: ComponentProps<'h1'> &
  HeadingVariantProps & { as?: 'h1' | 'h2' | 'h3' | 'h4' }) {
  return <Tag className={headingVariants({ variant, className })} {...props} />;
}

export function Text({
  variant = 'muted',
  className,
  ...props
}: ComponentProps<'p'> & { variant?: keyof typeof texts }) {
  return <p className={cn(texts[variant], className)} {...props} />;
}
