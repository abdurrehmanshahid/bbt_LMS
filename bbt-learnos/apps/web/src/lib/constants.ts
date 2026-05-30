export const TIER_LABEL: Record<number, string> = {
  1: 'Emerging',
  2: 'Verified',
  3: 'Expert Mentor',
};

export const TIER_COLOR: Record<number, string> = {
  1: 'text-slate-400',
  2: 'text-blue-400',
  3: 'text-[#F7941D]',
};

export const TIER_BORDER_COLOR: Record<number, string> = {
  1: 'text-navy-400 border-navy-600',
  2: 'text-blue-400 border-blue-600',
  3: 'text-[#F7941D] border-orange-600',
};

export const TIER_BADGE_BG: Record<number, string> = {
  1: 'bg-slate-700',
  2: 'bg-blue-500/20',
  3: 'bg-[#F7941D]/20',
};

export const REACTION_EMOJIS: Record<string, string> = {
  LIKE: '👍',
  FIRE: '🔥',
  MIND_BLOWN: '🤯',
};
