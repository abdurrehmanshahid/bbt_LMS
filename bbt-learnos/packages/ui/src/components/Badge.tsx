import * as React from 'react';
import { cn } from '../utils/cn';

export type BadgeVariant = 'skill' | 'status' | 'tier';
export type BadgeColor = 'orange' | 'indigo' | 'green' | 'red' | 'gray' | 'yellow';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  color?: BadgeColor;
  icon?: React.ReactNode;
}

const colorClasses: Record<BadgeColor, string> = {
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  gray: 'bg-navy-100 text-navy-600 dark:bg-navy-700 dark:text-navy-300',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
};

const variantDefaults: Record<BadgeVariant, BadgeColor> = {
  skill: 'indigo',
  status: 'gray',
  tier: 'orange',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'status', color, icon, className, children, ...props }, ref) => {
    const resolvedColor = color ?? variantDefaults[variant];
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium font-mono',
          colorClasses[resolvedColor],
          className,
        )}
        {...props}
      >
        {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
        {children}
      </span>
    );
  },
);
Badge.displayName = 'Badge';
