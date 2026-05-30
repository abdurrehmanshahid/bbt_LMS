import * as React from 'react';

import { cn } from '../utils/cn';

import { Button } from './Button';
import { ProgressBar } from './ProgressBar';

export interface TrackCardProps {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  trackNumber: number;
  enrollmentCount: number;
  avgCompletionRate: number;
  moduleCount?: number;
  isEnrolled?: boolean;
  completionPct?: number;
  onEnroll?: (trackId: string) => void;
  onView?: (slug: string) => void;
  className?: string;
}

export const TrackCard: React.FC<TrackCardProps> = ({
  id,
  slug,
  title,
  description,
  icon,
  trackNumber,
  enrollmentCount,
  avgCompletionRate,
  moduleCount,
  isEnrolled = false,
  completionPct,
  onEnroll,
  onView,
  className,
}) => (
  <div
    className={cn(
      'group relative flex flex-col rounded-2xl border border-navy-100 dark:border-navy-700',
      'bg-white dark:bg-navy-800 p-5 gap-4 transition-shadow hover:shadow-lg hover:shadow-navy-900/10',
      className,
    )}
  >
    {/* Track number badge */}
    <span className="absolute top-4 right-4 font-mono text-xs font-bold text-navy-300 dark:text-navy-600">
      {String(trackNumber).padStart(2, '0')}
    </span>

    {/* Icon + title */}
    <div className="flex items-start gap-3">
      <span className="text-3xl shrink-0" role="img" aria-label={title}>{icon}</span>
      <div>
        <h3 className="font-display text-lg leading-tight text-navy-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm text-navy-500 dark:text-navy-300 line-clamp-2">{description}</p>
      </div>
    </div>

    {/* Stats */}
    <div className="flex gap-4 text-xs font-mono text-navy-500 dark:text-navy-400">
      <span>{enrollmentCount.toLocaleString()} learners</span>
      {moduleCount !== undefined && <span>{moduleCount} modules</span>}
      <span>{Math.round(avgCompletionRate * 100)}% completion</span>
    </div>

    {/* Progress (enrolled learners) */}
    {isEnrolled && completionPct !== undefined && (
      <ProgressBar value={completionPct} color="orange" showLabel label="Your progress" />
    )}

    {/* Actions */}
    <div className="flex gap-2 mt-auto pt-2">
      {isEnrolled ? (
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={() => onView?.(slug)}
          aria-label={`Continue ${title}`}
        >
          Continue
        </Button>
      ) : (
        <>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => onEnroll?.(id)}
            aria-label={`Enroll in ${title}`}
          >
            Start Free
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView?.(slug)}
            aria-label={`View ${title} details`}
          >
            View
          </Button>
        </>
      )}
    </div>
  </div>
);

TrackCard.displayName = 'TrackCard';
