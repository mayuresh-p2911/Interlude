import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import {
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  VerifyTwoFactorDto,
  ResendTwoFactorDto,
} from './dto/auth.dto';
import { CurrentUser, AuthUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('captcha')
  @ApiOperation({ summary: 'Generate a new CAPTCHA challenge' })
  async getCaptcha() {
    return this.authService.generateCaptcha();
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA code sent to email' })
  async verifyTwoFactor(
    @Req() req: Request,
    @Body() dto: VerifyTwoFactorDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyTwoFactor(dto.tempToken, dto.code);
    this.setRefreshCookie(req, res, result.sessionToken, result.rememberMe);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Public()
  @Post('resend-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend 2FA code to email' })
  async resendTwoFactor(@Body() dto: ResendTwoFactorDto) {
    return this.authService.resendTwoFactor(dto.tempToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current user' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = (req.cookies?.['refresh_token'] as string) ?? '';
    if (rawToken) {
      await this.authService.revokeSession(rawToken);
    }
    const origin = (req.headers['origin'] as string) || (req.headers['referer'] as string) || '';
    const isProd = process.env.NODE_ENV === 'production' || origin.includes('vercel.app');
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || origin.startsWith('https://');
    const useSecureCookie = isProd || isHttps;

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: useSecureCookie,
      sameSite: useSecureCookie ? 'none' : 'lax',
      path: '/',
    });
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using session cookie' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = (req.cookies?.['refresh_token'] as string) ?? '';
    const result = await this.authService.refreshSession(rawToken);
    this.setRefreshCookie(req, res, result.newSessionToken, result.rememberMe);
    return { accessToken: result.accessToken };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Req() req: Request, @Body() dto: ForgotPasswordDto) {
    const rawOrigin =
      (req.headers['origin'] as string) ||
      (req.headers['referer'] as string);

    let requestOrigin: string | undefined = undefined;
    if (rawOrigin) {
      try {
        requestOrigin = new URL(rawOrigin).origin;
      } catch {}
    }

    if (!requestOrigin) {
      const host = (req.headers['x-forwarded-host'] as string) || req.headers['host'];
      const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
      if (host) {
        requestOrigin = `${proto}://${host}`;
      }
    }

    return this.authService.forgotPassword(dto, requestOrigin);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiBearerAuth()
  async getMe(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user._id);
  }

  // ── Helper ────────────────────────────────────────────────────
  private setRefreshCookie(req: Request, res: Response, token: string, rememberMe = false) {
    const origin = (req.headers['origin'] as string) || (req.headers['referer'] as string) || '';
    const isProd = process.env.NODE_ENV === 'production' || origin.includes('vercel.app');
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || origin.startsWith('https://');
    const useSecureCookie = isProd || isHttps;
    const sameSiteOption = useSecureCookie ? 'none' : 'lax';

    this.logger.log(
      `[AUTH_COOKIE] rememberMe: ${rememberMe} persistent: ${rememberMe} secure: ${useSecureCookie} sameSite: ${sameSiteOption}`,
    );

    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: useSecureCookie,
      sameSite: sameSiteOption,
      path: '/',
      ...(rememberMe ? { maxAge: 365 * 24 * 60 * 60 * 1000 } : {}),
    });
  }
}
