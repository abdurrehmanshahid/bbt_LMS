export enum AssessmentStatus {
  LOCKED = 'LOCKED',
  AVAILABLE = 'AVAILABLE',
  PASSED = 'PASSED',
  LOCKED_RETRY = 'LOCKED_RETRY',
}

export interface AssessmentDto {
  id: string;
  learnerId: string;
  moduleId: string;
  attemptNumber: number;
  score: number;
  passed: boolean;
  submittedAt: Date;
  flaggedForReview: boolean;
}

export interface SkillBadgeDto {
  id: string;
  learnerId: string;
  conceptId: string;
  score: number;
  issuedAt: Date;
  verificationUrl: string;
  isRevoked: boolean;
  standard: 'OpenBadges3.0';
}

export interface AssessmentResultDto {
  score: number;
  passed: boolean;
  badgeIssued: boolean;
  badge?: SkillBadgeDto;
  retryAfterHours?: number;
  flaggedForReview: boolean;
}
