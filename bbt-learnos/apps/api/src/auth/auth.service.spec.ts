import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { EmailService } from '../email/email.service';
import { KeysService } from '../keys/keys.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

import { AuthService } from './auth.service';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockPipeline = {
  del: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  pipeline: jest.fn().mockReturnValue(mockPipeline),
  decode: jest.fn(),
};

const mockJwt = {
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
};

const mockEmail = {
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string, fallback?: string) => fallback ?? ''),
};

const mockKeys = {
  privateKey: 'mock-private-key',
  publicKey: 'mock-public-key',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<{
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  creatorProfile: { tier: number } | null;
}> = {}) => ({
  id: 'user-uuid',
  email: 'test@bbt.edu.pk',
  passwordHash: '$2b$12$hashedpassword',
  role: UserRole.LEARNER,
  isActive: true,
  emailVerified: true,
  creatorProfile: null,
  ...overrides,
});

const makeJwtPayload = (overrides = {}) => ({
  sub: 'user-uuid',
  role: UserRole.LEARNER,
  tier: 0,
  sessionId: 'session-uuid',
  jti: 'access-jti',
  exp: Math.floor(Date.now() / 1000) + 900,
  ...overrides,
});

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default mock implementations
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.sadd.mockResolvedValue(1);
    mockRedis.srem.mockResolvedValue(1);
    mockRedis.smembers.mockResolvedValue([]);
    mockJwt.sign.mockReturnValue('mock-token');
    mockJwt.decode.mockReturnValue(null);

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: EmailService, useValue: mockEmail },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: KeysService, useValue: mockKeys },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  // ─── signup ────────────────────────────────────────────────────────────────

  describe('signup', () => {
    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());

      await expect(
        service.signup({ email: 'test@bbt.edu.pk', password: 'Pass123!', name: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user, sends verification email, returns tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(makeUser());
      mockEmail.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.signup({
        email: 'new@bbt.edu.pk',
        password: 'Pass123!',
        name: 'New User',
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'new@bbt.edu.pk', role: UserRole.LEARNER }),
        }),
      );
      expect(mockEmail.sendVerificationEmail).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('throws 429 when account is locked', async () => {
      mockRedis.get.mockResolvedValue('1'); // locked

      await expect(
        service.login({ email: 'test@bbt.edu.pk', password: 'Pass123!' }),
      ).rejects.toThrow(HttpException);
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@bbt.edu.pk', password: 'Pass123!' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it('throws UnauthorizedException on wrong password', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(
        makeUser({ passwordHash: await bcrypt.hash('CorrectPass123!', 1) }),
      );

      await expect(
        service.login({ email: 'test@bbt.edu.pk', password: 'WrongPass123!' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it('locks account after 5 failed attempts', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockRedis.incr.mockResolvedValue(5); // 5th attempt

      await expect(
        service.login({ email: 'test@bbt.edu.pk', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('auth:lock:'),
        '1',
        'EX',
        expect.any(Number),
      );
      expect(mockRedis.del).toHaveBeenCalledWith(expect.stringContaining('auth:fail:'));
    });

    it('throws ForbiddenException when account inactive', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(
        makeUser({ passwordHash: await bcrypt.hash('Pass123!', 1), isActive: false }),
      );

      await expect(
        service.login({ email: 'test@bbt.edu.pk', password: 'Pass123!' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when email not verified', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(
        makeUser({ passwordHash: await bcrypt.hash('Pass123!', 1), emailVerified: false }),
      );

      await expect(
        service.login({ email: 'test@bbt.edu.pk', password: 'Pass123!' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('clears fail counter and returns tokens on success', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(
        makeUser({ passwordHash: await bcrypt.hash('Pass123!', 1) }),
      );

      const result = await service.login({ email: 'test@bbt.edu.pk', password: 'Pass123!' });

      expect(mockRedis.del).toHaveBeenCalledWith(expect.stringContaining('auth:fail:'));
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('includes creator tier in token when user is creator', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(
        makeUser({
          role: UserRole.CREATOR,
          passwordHash: await bcrypt.hash('Pass123!', 1),
          creatorProfile: { tier: 2 },
        }),
      );

      await service.login({ email: 'creator@bbt.edu.pk', password: 'Pass123!' });

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ tier: 2, role: UserRole.CREATOR }),
        expect.anything(),
      );
    });
  });

  // ─── refresh ───────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('throws UnauthorizedException on invalid JWT', async () => {
      mockJwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });

      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException (REFRESH_TOKEN_REUSED) when Redis entry missing', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'user-uuid', sessionId: 'sid', jti: 'jti-1' });
      mockRedis.get.mockResolvedValue(null); // not in Redis

      await expect(service.refresh('valid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException on userId mismatch (reuse attack)', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'user-uuid', sessionId: 'sid', jti: 'jti-1' });
      mockRedis.get.mockResolvedValue(
        JSON.stringify({ userId: 'different-user', sessionId: 'sid' }),
      );

      await expect(service.refresh('valid-token')).rejects.toThrow(UnauthorizedException);
      expect(mockRedis.del).toHaveBeenCalledWith('auth:refresh:jti-1');
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'user-uuid', sessionId: 'sid', jti: 'jti-1' });
      mockRedis.get.mockResolvedValue(JSON.stringify({ userId: 'user-uuid', sessionId: 'sid' }));
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh('valid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is inactive', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'user-uuid', sessionId: 'sid', jti: 'jti-1' });
      mockRedis.get.mockResolvedValue(JSON.stringify({ userId: 'user-uuid', sessionId: 'sid' }));
      mockPrisma.user.findUnique.mockResolvedValue(makeUser({ isActive: false }));

      await expect(service.refresh('valid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('rotates refresh token and returns new tokens', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'user-uuid', sessionId: 'sid', jti: 'old-jti' });
      mockRedis.get.mockResolvedValue(JSON.stringify({ userId: 'user-uuid', sessionId: 'sid' }));
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await service.refresh('valid-token');

      expect(mockRedis.del).toHaveBeenCalledWith('auth:refresh:old-jti');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('preserves session ID on rotation', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'user-uuid', sessionId: 'original-sid', jti: 'old-jti' });
      mockRedis.get.mockResolvedValue(JSON.stringify({ userId: 'user-uuid', sessionId: 'original-sid' }));
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());

      await service.refresh('valid-token');

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'original-sid' }),
        expect.anything(),
      );
    });
  });

  // ─── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('blacklists access token when remaining time > 0', async () => {
      const payload = makeJwtPayload({ exp: Math.floor(Date.now() / 1000) + 900 });

      await service.logout(payload);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `auth:blacklist:${payload.jti}`,
        '1',
        'EX',
        expect.any(Number),
      );
    });

    it('does not blacklist when token already expired', async () => {
      const payload = makeJwtPayload({ exp: Math.floor(Date.now() / 1000) - 10 });

      await service.logout(payload);

      expect(mockRedis.set).not.toHaveBeenCalledWith(
        expect.stringContaining('auth:blacklist'),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('deletes refresh token and removes from sessions set', async () => {
      const payload = makeJwtPayload();
      mockJwt.decode.mockReturnValue({ jti: 'refresh-jti' });

      await service.logout(payload, 'raw-refresh-token');

      expect(mockRedis.del).toHaveBeenCalledWith('auth:refresh:refresh-jti');
      expect(mockRedis.srem).toHaveBeenCalledWith(
        `auth:user_sessions:${payload.sub}`,
        'refresh-jti',
      );
    });

    it('handles missing refresh token gracefully', async () => {
      const payload = makeJwtPayload();
      mockJwt.decode.mockReturnValue(null);

      await service.logout(payload, undefined);

      expect(mockRedis.del).not.toHaveBeenCalledWith(expect.stringContaining('auth:refresh'));
    });
  });

  // ─── forgotPassword ────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('returns void silently when user not found (no email enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.forgotPassword({ email: 'nobody@bbt.edu.pk' })).resolves.toBeUndefined();
      expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('stores reset token in Redis and sends email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      mockEmail.sendPasswordResetEmail.mockResolvedValue(undefined);

      await service.forgotPassword({ email: 'test@bbt.edu.pk' });

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('auth:reset:'),
        'user-uuid',
        'EX',
        3600,
      );
      expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalled();
    });
  });

  // ─── resetPassword ─────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('throws BadRequestException when token not in Redis', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa', password: 'NewPass123!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates password and invalidates sessions', async () => {
      mockRedis.get.mockResolvedValue('user-uuid');
      mockPrisma.user.update.mockResolvedValue(makeUser());
      mockRedis.smembers.mockResolvedValue(['jti-1', 'jti-2']);

      await service.resetPassword({
        token: 'aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa',
        password: 'NewPass123!',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ passwordHash: expect.any(String) }) }),
      );
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:refresh:jti-1');
      expect(mockPipeline.del).toHaveBeenCalledWith('auth:refresh:jti-2');
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('succeeds when user has no active sessions', async () => {
      mockRedis.get.mockResolvedValue('user-uuid');
      mockPrisma.user.update.mockResolvedValue(makeUser());
      mockRedis.smembers.mockResolvedValue([]);

      await expect(
        service.resetPassword({ token: 'aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa', password: 'NewPass123!' }),
      ).resolves.toBeUndefined();

      expect(mockPipeline.exec).not.toHaveBeenCalled();
    });
  });

  // ─── handleGoogleCallback ──────────────────────────────────────────────────

  describe('handleGoogleCallback', () => {
    const googleUser = { email: 'google@gmail.com', name: 'Google User', avatarUrl: 'https://avatar.url' };

    it('creates new user and returns tokens when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(makeUser({ email: 'google@gmail.com' }));

      const result = await service.handleGoogleCallback(googleUser);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'google@gmail.com', emailVerified: true }),
        }),
      );
      expect(result).toHaveProperty('accessToken');
    });

    it('returns tokens for existing user without creating a new one', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser({ email: 'google@gmail.com' }));

      const result = await service.handleGoogleCallback(googleUser);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
    });
  });

  // ─── handleAppleSignIn ─────────────────────────────────────────────────────

  describe('handleAppleSignIn', () => {
    const FAKE_KID = 'test-kid';
    const TOKEN_WITH_KID = `${Buffer.from(JSON.stringify({ kid: FAKE_KID, alg: 'RS256' })).toString('base64url')}.payload.sig`;
    const FAKE_PEM = '-----BEGIN PUBLIC KEY-----\nfake\n-----END PUBLIC KEY-----';
    const APPLE_EMAIL = 'apple@privaterelay.appleid.com';

    beforeEach(() => {
      // Mock fetch to return a matching JWKS entry
      jest.spyOn(global, 'fetch').mockResolvedValue({
        json: () => Promise.resolve({ keys: [{ kid: FAKE_KID, kty: 'RSA' }] }),
      } as unknown as Response);

      // Mock the JWK→PEM conversion on the service instance (avoids touching native crypto)
      jest.spyOn(service as any, 'jwkToPem').mockReturnValue(FAKE_PEM);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('throws UnauthorizedException for malformed token (not 3 parts)', async () => {
      await expect(service.handleAppleSignIn({ idToken: 'bad.token' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when kid not found in Apple JWKS', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        json: () => Promise.resolve({ keys: [] }), // no matching key
      } as unknown as Response);

      await expect(
        service.handleAppleSignIn({
          idToken: `${Buffer.from(JSON.stringify({ kid: 'missing-kid' })).toString('base64url')}.payload.sig`,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when JWT verification fails', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(service.handleAppleSignIn({ idToken: TOKEN_WITH_KID })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when email is missing from Apple payload', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'apple-uid' }); // no email

      await expect(service.handleAppleSignIn({ idToken: TOKEN_WITH_KID })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('creates new user when not found and returns tokens', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'apple-uid', email: APPLE_EMAIL });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(makeUser({ email: APPLE_EMAIL }));

      const result = await service.handleAppleSignIn({ idToken: TOKEN_WITH_KID, name: 'Apple User' });

      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
    });

    it('returns tokens for existing Apple user without creating new user', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'apple-uid', email: APPLE_EMAIL });
      mockPrisma.user.findUnique.mockResolvedValue(makeUser({ email: APPLE_EMAIL }));

      const result = await service.handleAppleSignIn({ idToken: TOKEN_WITH_KID });

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
    });
  });

  // ─── jwkToPem (protected) ─────────────────────────────────────────────────

  describe('jwkToPem', () => {
    it('converts a valid RSA JWK to PEM format', () => {
      const { generateKeyPairSync, createPublicKey } = require('crypto') as typeof import('crypto');
      const { publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 1024, // small for test speed
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      const jwk = createPublicKey(publicKey).export({ format: 'jwk' });

      const pem = (service as any).jwkToPem(jwk) as string;

      expect(pem).toContain('-----BEGIN PUBLIC KEY-----');
      expect(pem).toContain('-----END PUBLIC KEY-----');
    });
  });

  // ─── verifyEmail ───────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('throws BadRequestException when token not in Redis', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(BadRequestException);
    });

    it('marks user email as verified and cleans up Redis token', async () => {
      mockRedis.get.mockResolvedValue('user-uuid');
      mockPrisma.user.update.mockResolvedValue(makeUser({ emailVerified: true }));

      await service.verifyEmail('valid-token');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid' },
        data: { emailVerified: true },
      });
      expect(mockRedis.del).toHaveBeenCalledWith('auth:verify:valid-token');
    });
  });
});
