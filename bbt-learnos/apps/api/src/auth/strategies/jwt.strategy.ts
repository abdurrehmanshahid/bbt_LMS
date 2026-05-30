import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { KeysService } from '../../keys/keys.service';
import { RedisService } from '../../redis/redis.service';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    keysService: KeysService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (
        _req: Request,
        _rawToken: string,
        done: (err: Error | null, key?: string) => void,
      ) => {
        done(null, keysService.publicKey);
      },
      algorithms: ['RS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const blacklisted = await this.redis.get(`auth:blacklist:${payload.jti}`);
    if (blacklisted) {
      throw new UnauthorizedException({ code: 'TOKEN_INVALID' });
    }
    return payload;
  }
}
