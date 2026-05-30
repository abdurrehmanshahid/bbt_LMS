import * as React from 'react';

import { cn } from '../utils/cn';

export interface FeaturePillProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon?: React.ReactNode;
}

export const FeaturePill: React.FC<FeaturePillProps> = ({ icon, children, className, ...props }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full border border-navy-200 dark:border-navy-600',
      'bg-white dark:bg-navy-800 px-3 py-1 text-xs font-mono text-navy-600 dark:text-navy-300',
      className,
    )}
    {...props}
  >
    {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
    {children}
  </span>
);

FeaturePill.displayName = 'FeaturePill';
