import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '../utils/cn';

export type ProgressColor = 'indigo' | 'orange' | 'green' | 'red';

export interface ProgressBarProps {
  value: number;
  max?: number;
  color?: ProgressColor;
  animated?: boolean;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const trackColors: Record<ProgressColor, string> = {
  indigo: 'bg-indigo-100 dark:bg-indigo-900/30',
  orange: 'bg-orange-100 dark:bg-orange-900/30',
  green: 'bg-green-100 dark:bg-green-900/30',
  red: 'bg-red-100 dark:bg-red-900/30',
};

const fillColors: Record<ProgressColor, string> = {
  indigo: 'bg-indigo-600',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = 'indigo',
  animated = false,
  showLabel = false,
  label,
  className,
}) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between text-xs font-mono text-navy-500 dark:text-navy-400">
          <span>{label ?? 'Progress'}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <ProgressPrimitive.Root
        value={pct}
        max={100}
        className={cn('relative h-2 w-full overflow-hidden rounded-full', trackColors[color])}
        aria-label={label ?? 'Progress'}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            'h-full rounded-full transition-all duration-500',
            fillColors[color],
            animated && 'animate-pulse',
          )}
          style={{ width: `${pct}%` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
};

ProgressBar.displayName = 'ProgressBar';
