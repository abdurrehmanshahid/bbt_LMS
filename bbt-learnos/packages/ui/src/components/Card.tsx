import * as React from 'react';
import { cn } from '../utils/cn';

export type CardVariant = 'default' | 'elevated' | 'bordered';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-white dark:bg-navy-800',
  elevated: 'bg-white dark:bg-navy-800 shadow-lg shadow-navy-900/10 dark:shadow-navy-950/40',
  bordered: 'bg-white dark:bg-navy-800 border border-navy-200 dark:border-navy-600',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-xl overflow-hidden', variantClasses[variant], className)}
      {...props}
    >
      {children}
    </div>
  ),
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-5 py-4 border-b border-navy-100 dark:border-navy-700', className)}
      {...props}
    >
      {children}
    </div>
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardBody = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('px-5 py-4', className)} {...props}>
      {children}
    </div>
  ),
);
CardBody.displayName = 'CardBody';

export const CardFooter = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-5 py-4 border-t border-navy-100 dark:border-navy-700', className)}
      {...props}
    >
      {children}
    </div>
  ),
);
CardFooter.displayName = 'CardFooter';
