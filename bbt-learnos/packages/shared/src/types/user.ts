export enum UserRole {
  LEARNER = 'LEARNER',
  CREATOR = 'CREATOR',
  ADMIN = 'ADMIN',
  EMPLOYER = 'EMPLOYER',
  FRANCHISE_OWNER = 'FRANCHISE_OWNER',
}

export enum AbsorptionStatus {
  INELIGIBLE = 'INELIGIBLE',
  ELIGIBLE = 'ELIGIBLE',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ABSORBED = 'ABSORBED',
  REFERRED = 'REFERRED',
}

export enum CreatorTier {
  COMMUNITY = 1,
  VERIFIED_EDUCATOR = 2,
  EXPERT_MENTOR = 3,
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
}

export interface LearnerProfileDto {
  id: string;
  userId: string;
  currentTrackId: string | null;
  streakDays: number;
  lastActiveAt: Date;
  absorptionScore: number;
  absorptionStatus: AbsorptionStatus;
}

export interface CreatorProfileDto {
  id: string;
  userId: string;
  tier: CreatorTier;
  displayName: string;
  bio: string;
  qualityScore: number;
  isVerified: boolean;
  revenueSharePercent: number;
}
