export enum PaymentGateway {
  STRIPE = 'STRIPE',
  JAZZCASH = 'JAZZCASH',
  EASYPAISA = 'EASYPAISA',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum EnrollmentPlan {
  FREE = 'FREE',
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL',
}

export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export interface EnrollmentDto {
  id: string;
  learnerId: string;
  trackId: string;
  plan: EnrollmentPlan;
  status: EnrollmentStatus;
  startDate: Date;
  endDate: Date | null;
}
