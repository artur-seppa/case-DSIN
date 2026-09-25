import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export type BadgeVariant = 'warning' | 'success' | 'info' | 'error' | 'neutral';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  warning: 'bg-warning-bg text-warning-800',
  success: 'bg-success-700 text-white',
  info: 'bg-info-700 text-white',
  error: 'bg-error-700 text-white',
  neutral: 'bg-border text-text-secondary',
};

export interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-micro font-medium',
        VARIANT_CLASSES[variant],
      )}
    >
      {children}
    </span>
  );
}
