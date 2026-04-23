import * as React from 'react';
import { cn } from '../utils/cn';

export interface Phase {
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

export interface PhaseStepProps {
  phases?: Phase[];
  activeIndex?: number;
  className?: string;
}

const DEFAULT_PHASES: Phase[] = [
  { label: 'Train', description: 'Learn through tracks' },
  { label: 'Intern', description: 'Apply in real projects' },
  { label: 'Shadow', description: 'Work alongside experts' },
  { label: 'Expert', description: 'Lead and specialise' },
];

export const PhaseStep: React.FC<PhaseStepProps> = ({
  phases = DEFAULT_PHASES,
  activeIndex,
  className,
}) => (
  <nav aria-label="Learner pathway" className={cn('flex items-center gap-0', className)}>
    {phases.map((phase, idx) => {
      const isActive = idx === activeIndex;
      const isCompleted = activeIndex !== undefined && idx < activeIndex;
      const isLast = idx === phases.length - 1;

      return (
        <React.Fragment key={phase.label}>
          <div className="flex flex-col items-center gap-1 min-w-[4rem]">
            {/* Circle indicator */}
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-mono font-bold transition-colors',
                isCompleted
                  ? 'border-orange-500 bg-orange-500 text-white'
                  : isActive
                  ? 'border-orange-500 bg-white dark:bg-navy-800 text-orange-500'
                  : 'border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-800 text-navy-400',
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              {phase.icon ?? (isCompleted ? '✓' : String(idx + 1))}
            </div>

            {/* Label */}
            <span
              className={cn(
                'text-xs font-display tracking-wide text-center whitespace-nowrap',
                isActive ? 'text-orange-500' : isCompleted ? 'text-orange-400' : 'text-navy-400 dark:text-navy-500',
              )}
            >
              {phase.label}
            </span>

            {/* Description (shown below label, hidden on mobile) */}
            {phase.description && (
              <span className="hidden sm:block text-[10px] text-navy-400 dark:text-navy-500 text-center max-w-[5rem] leading-tight">
                {phase.description}
              </span>
            )}
          </div>

          {/* Connector line */}
          {!isLast && (
            <div
              className={cn(
                'h-0.5 flex-1 mt-[-1.25rem] transition-colors',
                isCompleted ? 'bg-orange-500' : 'bg-navy-100 dark:bg-navy-700',
              )}
              aria-hidden="true"
            />
          )}
        </React.Fragment>
      );
    })}
  </nav>
);

PhaseStep.displayName = 'PhaseStep';
