import * as React from 'react';
import { cn } from '../utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'card' | 'feed-item' | 'video-player' | 'profile' | 'text' | 'circle';
}

const baseClass = 'animate-pulse bg-navy-100 dark:bg-navy-700 rounded-md';

const Block: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn(baseClass, className)} {...props} />
);

function CardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-navy-100 dark:border-navy-700 p-5 space-y-3">
      <Block className="h-4 w-2/3" />
      <Block className="h-3 w-full" />
      <Block className="h-3 w-4/5" />
      <div className="flex gap-2 pt-2">
        <Block className="h-8 w-20 rounded-full" />
        <Block className="h-8 w-20 rounded-full" />
      </div>
    </div>
  );
}

function FeedItemSkeleton() {
  return (
    <div className="flex gap-3 p-3">
      <Block className="h-20 w-32 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Block className="h-4 w-3/4" />
        <Block className="h-3 w-1/2" />
        <Block className="h-3 w-1/4" />
      </div>
    </div>
  );
}

function VideoPlayerSkeleton() {
  return (
    <div className="w-full space-y-3">
      <Block className="w-full aspect-video rounded-xl" />
      <Block className="h-5 w-2/3" />
      <Block className="h-4 w-1/3" />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex gap-4 p-4">
      <Block className="h-16 w-16 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Block className="h-5 w-1/3" />
        <Block className="h-3 w-2/3" />
        <Block className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export const Skeleton: React.FC<SkeletonProps> = ({ variant = 'text', className, ...props }) => {
  if (variant === 'card') return <CardSkeleton />;
  if (variant === 'feed-item') return <FeedItemSkeleton />;
  if (variant === 'video-player') return <VideoPlayerSkeleton />;
  if (variant === 'profile') return <ProfileSkeleton />;
  if (variant === 'circle') return <div className={cn(baseClass, 'rounded-full', className)} {...props} />;
  return <div className={cn(baseClass, 'h-4', className)} {...props} />;
};

Skeleton.displayName = 'Skeleton';
