import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import type { GoogleUser } from './strategies/google.strategy';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AppleSignInDto } from './dto/apple-signin.dto';
import { ConfigService } from '@nestjs/config';

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const { accessToken, refreshToken } = await this.authService.signup(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const cookies = req.cookies as Record<string, string> | undefined;
    const rawToken = cookies?.[REFRESH_COOKIE];
    if (!rawToken) throw new UnauthorizedException({ code: 'TOKEN_INVALID' });

    const { accessToken, refreshToken } = await this.authService.refresh(rawToken);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    const cookies = req.cookies as Record<string, string> | undefined;
    await this.authService.logout(user, cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    return { success: true };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleInit(): void {
    // Passport redirects to Google — no body needed
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request & { user: GoogleUser },
    @Res() res: Response,
  ): Promise<void> {
    const { accessToken, refreshToken } = await this.authService.handleGoogleCallback(req.user);
    this.setRefreshCookie(res, refreshToken);
    const frontend = this.configService.get<string>('NEXT_PUBLIC_API_URL', 'http://localhost:3000');
    res.redirect(`${frontend}/auth/callback?token=${encodeURIComponent(accessToken)}`);
  }

  @Post('apple')
  @HttpCode(HttpStatus.OK)
  async apple(
    @Body() dto: AppleSignInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const { accessToken, refreshToken } = await this.authService.handleAppleSignIn(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ success: boolean }> {
    await this.authService.forgotPassword(dto);
    return { success: true };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ success: boolean }> {
    await this.authService.resetPassword(dto);
    return { success: true };
  }

  @Get('verify-email/:token')
  async verifyEmail(@Param('token') token: string): Promise<{ success: boolean }> {
    await this.authService.verifyEmail(token);
    return { success: true };
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      ...COOKIE_OPTS,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
    });
  }
}
