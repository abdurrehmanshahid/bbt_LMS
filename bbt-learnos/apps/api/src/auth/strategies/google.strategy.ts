import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';

export interface GoogleUser {
  email: string;
  name: string;
  avatarUrl: string | null;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID', 'dev-client-id'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET', 'dev-client-secret'),
      callbackURL: `${configService.get<string>('NEXT_PUBLIC_API_URL', 'http://localhost:4000')}/api/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const user: GoogleUser = {
      email: profile.emails?.[0]?.value ?? '',
      name: [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(' ') || profile.displayName,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
    done(null, user);
  }
}
