import type { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  tier: number;
  sessionId: string;
  jti: string;
  iat?: number;
  exp?: number;
}
