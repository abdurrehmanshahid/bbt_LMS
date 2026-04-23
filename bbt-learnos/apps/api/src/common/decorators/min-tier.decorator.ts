import { SetMetadata } from '@nestjs/common';

export const MIN_TIER_KEY = 'minTier';
export const MinTier = (tier: number): ReturnType<typeof SetMetadata> =>
  SetMetadata(MIN_TIER_KEY, tier);
