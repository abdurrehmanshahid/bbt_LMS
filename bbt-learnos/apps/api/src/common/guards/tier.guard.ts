import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MIN_TIER_KEY } from '../decorators/min-tier.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class TierGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const minTier = this.reflector.getAllAndOverride<number | undefined>(MIN_TIER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (minTier === undefined || minTier === null) return true;

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();

    if (!user || user.tier < minTier) {
      throw new ForbiddenException('Insufficient creator tier');
    }

    return true;
  }
}
