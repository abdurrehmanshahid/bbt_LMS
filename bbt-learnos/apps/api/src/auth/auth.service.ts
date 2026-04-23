import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID, createPublicKey, type JsonWebKey } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';
import { KeysService } from '../keys/keys.service';
import type { SignupDto } from './dto/signup.dto';
import type { LoginDto } from './dto/login.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { AppleSignInDto } from './dto/apple-signin.dto';
import type { AuthTokens } from './interfaces/auth-tokens.interface';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

const BCRYPT_COST = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TTL = 15 * 60;
const REFRESH_TTL = 30 * 24 * 60 * 60;
const RESET_TTL = 60 * 60;
const VERIFY_TTL = 24 * 60 * 60;

interface RefreshPayload {
  sub: string;
  sessionId: string;
  jti: string;
}

interface StoredRefresh {
  userId: string;
  sessionId: string;
}

type AppleJwk = JsonWebKey & { kid: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly email: EmailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly keys: KeysService,
  ) {}

  // ─── Public API ─────────────────────────────────────────────────────────────

  async signup(dto: SignupDto): Promise<AuthTokens> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException({ code: 'EMAIL_ALREADY_EXISTS' });

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: UserRole.LEARNER,
        learnerProfile: { create: {} },
      },
    });

    const verifyToken = randomUUID();
    await this.redis.set(`auth:verify:${verifyToken}`, user.id, 'EX', VERIFY_TTL);
    await this.email.sendVerificationEmail(user.email, verifyToken);

    return this.issueTokens(user.id, user.role, 0);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const lockKey = `auth:lock:${dto.email}`;
    const locked = await this.redis.get(lockKey);
    if (locked) {
      throw new HttpException({ code: 'ACCOUNT_LOCKED' }, HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { creatorProfile: true },
    });

    const failKey = `auth:fail:${dto.email}`;

    if (!user) {
      await this.incrementFails(failKey, lockKey);
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.incrementFails(failKey, lockKey);
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });
    }

    if (!user.isActive) throw new ForbiddenException({ code: 'ACCOUNT_INACTIVE' });
    if (!user.emailVerified) throw new ForbiddenException({ code: 'EMAIL_NOT_VERIFIED' });

    await this.redis.del(failKey);

    const tier = user.creatorProfile?.tier ?? 0;
    return this.issueTokens(user.id, user.role, tier);
  }

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    let payload: RefreshPayload;
    try {
      payload = this.jwtService.verify<RefreshPayload>(rawRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-dev-secret'),
      });
    } catch {
      throw new UnauthorizedException({ code: 'TOKEN_INVALID' });
    }

    const storedRaw = await this.redis.get(`auth:refresh:${payload.jti}`);
    if (!storedRaw) {
      throw new UnauthorizedException({ code: 'REFRESH_TOKEN_REUSED' });
    }

    const stored = JSON.parse(storedRaw) as StoredRefresh;

    if (stored.userId !== payload.sub || stored.sessionId !== payload.sessionId) {
      await this.redis.del(`auth:refresh:${payload.jti}`);
      throw new UnauthorizedException({ code: 'REFRESH_TOKEN_REUSED' });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
      include: { creatorProfile: true },
    });

    if (!user || !user.isActive) throw new UnauthorizedException({ code: 'TOKEN_INVALID' });

    // Rotate: delete old entry, issue new tokens on same session
    await this.redis.del(`auth:refresh:${payload.jti}`);
    await this.redis.srem(`auth:user_sessions:${user.id}`, payload.jti);

    const tier = user.creatorProfile?.tier ?? 0;
    return this.issueTokens(user.id, user.role, tier, stored.sessionId);
  }

  async logout(jwtPayload: JwtPayload, rawRefreshToken?: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const remaining = (jwtPayload.exp ?? 0) - now;

    if (remaining > 0) {
      await this.redis.set(`auth:blacklist:${jwtPayload.jti}`, '1', 'EX', remaining);
    }

    if (rawRefreshToken) {
      const decoded = this.jwtService.decode<RefreshPayload>(rawRefreshToken);
      if (decoded?.jti) {
        await this.redis.del(`auth:refresh:${decoded.jti}`);
        await this.redis.srem(`auth:user_sessions:${jwtPayload.sub}`, decoded.jti);
      }
    }
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return; // Don't reveal whether email exists

    const resetToken = randomUUID();
    await this.redis.set(`auth:reset:${resetToken}`, user.id, 'EX', RESET_TTL);
    await this.email.sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const userId = await this.redis.get(`auth:reset:${dto.token}`);
    if (!userId) throw new BadRequestException({ code: 'TOKEN_INVALID' });

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.redis.del(`auth:reset:${dto.token}`);

    // Revoke all active sessions
    const sessionsKey = `auth:user_sessions:${userId}`;
    const jtis = await this.redis.smembers(sessionsKey);
    if (jtis.length > 0) {
      const pipeline = this.redis.pipeline();
      for (const jti of jtis) pipeline.del(`auth:refresh:${jti}`);
      pipeline.del(sessionsKey);
      await pipeline.exec();
    }
  }

  async handleGoogleCallback(googleUser: {
    email: string;
    name: string;
    avatarUrl: string | null;
  }): Promise<AuthTokens> {
    const existing = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
      include: { creatorProfile: true },
    });

    if (existing) {
      return this.issueTokens(existing.id, existing.role, existing.creatorProfile?.tier ?? 0);
    }

    const created = await this.prisma.user.create({
      data: {
        email: googleUser.email,
        passwordHash: '',
        name: googleUser.name,
        avatarUrl: googleUser.avatarUrl,
        role: UserRole.LEARNER,
        emailVerified: true,
        learnerProfile: { create: {} },
      },
      include: { creatorProfile: true },
    });

    return this.issueTokens(created.id, created.role, created.creatorProfile?.tier ?? 0);
  }

  async handleAppleSignIn(dto: AppleSignInDto): Promise<AuthTokens> {
    const applePayload = await this.verifyAppleToken(dto.idToken);

    const email = applePayload['email'] as string | undefined;
    if (!email) throw new UnauthorizedException({ code: 'TOKEN_INVALID' });

    const existing = await this.prisma.user.findUnique({
      where: { email },
      include: { creatorProfile: true },
    });

    if (existing) {
      return this.issueTokens(existing.id, existing.role, existing.creatorProfile?.tier ?? 0);
    }

    const created = await this.prisma.user.create({
      data: {
        email,
        passwordHash: '',
        name: dto.name ?? email.split('@')[0] ?? 'Apple User',
        role: UserRole.LEARNER,
        emailVerified: true,
        learnerProfile: { create: {} },
      },
      include: { creatorProfile: true },
    });

    return this.issueTokens(created.id, created.role, created.creatorProfile?.tier ?? 0);
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.redis.get(`auth:verify:${token}`);
    if (!userId) throw new BadRequestException({ code: 'TOKEN_INVALID' });

    await this.prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
    await this.redis.del(`auth:verify:${token}`);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async issueTokens(
    userId: string,
    role: UserRole,
    tier: number,
    existingSessionId?: string,
  ): Promise<AuthTokens> {
    const sessionId = existingSessionId ?? randomUUID();
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessToken = this.jwtService.sign(
      { sub: userId, role, tier, sessionId, jti: accessJti },
      {
        privateKey: this.keys.privateKey,
        algorithm: 'RS256',
        expiresIn: '15m',
      } as Parameters<JwtService['sign']>[1],
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, sessionId, jti: refreshJti },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-dev-secret'),
        algorithm: 'HS256',
        expiresIn: '30d',
      } as Parameters<JwtService['sign']>[1],
    );

    await this.redis.set(
      `auth:refresh:${refreshJti}`,
      JSON.stringify({ userId, sessionId } satisfies StoredRefresh),
      'EX',
      REFRESH_TTL,
    );
    await this.redis.sadd(`auth:user_sessions:${userId}`, refreshJti);
    await this.redis.expire(`auth:user_sessions:${userId}`, REFRESH_TTL);

    return { accessToken, refreshToken };
  }

  private async incrementFails(failKey: string, lockKey: string): Promise<void> {
    const count = await this.redis.incr(failKey);
    await this.redis.expire(failKey, LOCK_TTL);

    if (count >= MAX_LOGIN_ATTEMPTS) {
      await this.redis.set(lockKey, '1', 'EX', LOCK_TTL);
      await this.redis.del(failKey);
    }
  }

  private async verifyAppleToken(idToken: string): Promise<Record<string, unknown>> {
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new UnauthorizedException({ code: 'TOKEN_INVALID' });

    const header = JSON.parse(
      Buffer.from(parts[0]!, 'base64url').toString('utf8'),
    ) as { kid: string };

    const resp = await fetch('https://appleid.apple.com/auth/keys');
    const { keys } = (await resp.json()) as { keys: AppleJwk[] };
    const jwk = keys.find((k) => k.kid === header.kid);

    if (!jwk) throw new UnauthorizedException({ code: 'TOKEN_INVALID' });

    const pem = this.jwkToPem(jwk);

    try {
      return this.jwtService.verify<Record<string, unknown>>(idToken, {
        publicKey: pem,
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: this.configService.get<string>('APPLE_CLIENT_ID', ''),
      } as Parameters<JwtService['verify']>[1]);
    } catch {
      throw new UnauthorizedException({ code: 'TOKEN_INVALID' });
    }
  }

  // Extracted so tests can spy on the instance without touching the native crypto module
  protected jwkToPem(jwk: JsonWebKey): string {
    const key = createPublicKey({ key: jwk, format: 'jwk' });
    return key.export({ type: 'spki', format: 'pem' }) as string;
  }
}
