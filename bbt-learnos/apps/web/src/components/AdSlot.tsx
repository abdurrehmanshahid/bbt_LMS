'use client';

export type AdSlotId = 'homepage-banner' | 'feed-inline' | 'track-sidebar' | 'profile-bottom';

interface AdSlotProps {
  slot: AdSlotId;
  className?: string;
}

export function AdSlot({ slot, className = '' }: AdSlotProps): React.JSX.Element {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/5 bg-navy-900/30 ${className}`}
      data-ad-slot={slot}
      aria-label="Advertisement"
    >
      <div className="flex min-h-[80px] items-center justify-center p-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-navy-700">
          Advertisement
        </span>
      </div>
    </div>
  );
}
