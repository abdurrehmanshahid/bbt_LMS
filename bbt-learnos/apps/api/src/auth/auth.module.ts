import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { KeysService } from '../keys/keys.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';


@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService, KeysService],
      useFactory: (_configService: ConfigService, keysService: KeysService) => ({
        privateKey: keysService.privateKey,
        publicKey: keysService.publicKey,
        signOptions: { algorithm: 'RS256', expiresIn: '15m' },
        verifyOptions: { algorithms: ['RS256'] },
      }),
    }),
  ],
  providers: [KeysService, AuthService, JwtStrategy, GoogleStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
