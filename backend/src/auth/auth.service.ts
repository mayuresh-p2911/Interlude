import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { User, UserDocument } from '../schemas/user.schema';
import { Settings, SettingsDocument } from '../schemas/settings.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { EmailService } from '../common/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  // ── CAPTCHA Generation & Verification ────────────────────────
  async generateCaptcha() {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    const all = uppercase + lowercase + numbers;

    let code = '';
    // Ensure 1 uppercase, 1 lowercase, 1 number, plus 2 randoms (5 total)
    code += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    code += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    for (let i = 0; i < 2; i++) {
      code += all.charAt(Math.floor(Math.random() * all.length));
    }
    code = code.split('').sort(() => Math.random() - 0.5).join('');

    const token = await this.jwtService.signAsync(
      { captchaCode: code, type: 'CAPTCHA' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '5m',
      },
    );

    return { captchaToken: token, captchaText: code };
  }

  private async verifyCaptcha(captchaToken?: string, captchaInput?: string) {
    if (!captchaToken || !captchaInput) {
      throw new BadRequestException('CAPTCHA verification is required');
    }
    if (captchaToken.startsWith('fallback_')) {
      const parts = captchaToken.split('_');
      const expectedCode = parts[2];
      if (!expectedCode || captchaInput.trim() !== expectedCode) {
        throw new BadRequestException(
          'Incorrect CAPTCHA solution. Please check uppercase and lowercase characters.',
        );
      }
      return;
    }
    try {
      const payload = await this.jwtService.verifyAsync<{ captchaCode: string; type: string }>(
        captchaToken,
        { secret: this.configService.get<string>('JWT_SECRET') },
      );
      if (payload.type !== 'CAPTCHA' || !payload.captchaCode) {
        throw new BadRequestException('Invalid CAPTCHA token');
      }
      if (captchaInput.trim() !== payload.captchaCode) {
        throw new BadRequestException(
          'Incorrect CAPTCHA solution. Please check uppercase and lowercase characters.',
        );
      }
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Invalid or expired CAPTCHA code');
    }
  }

  // ── 2FA Helper ────────────────────────────────────────────────
  private generateMixed2FACode(): string {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numbers = '23456789';
    let code = '';
    // Ensure both letters AND numbers are mixed (e.g., 3 letters + 3 numbers)
    for (let i = 0; i < 3; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 3; i++) {
      code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    return code.split('').sort(() => Math.random() - 0.5).join('');
  }

  // ── Register ────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    await this.verifyCaptcha(dto.captchaToken, dto.captchaInput);

    const existingUser = await this.userModel.findOne({
      $or: [{ email: dto.email.toLowerCase() }, { username: dto.username }],
    });

    const twoFactorCode = this.generateMixed2FACode();
    const twoFactorExpiry = new Date(Date.now() + 10 * 60 * 1000);

    if (existingUser) {
      if (existingUser.isVerified) {
        throw new ConflictException(
          existingUser.email === dto.email.toLowerCase()
            ? 'Email already registered'
            : 'Username already taken',
        );
      }

      // If user exists but is NOT verified yet, update their pending registration
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      existingUser.username = dto.username;
      existingUser.email = dto.email.toLowerCase();
      existingUser.password = hashedPassword;
      existingUser.age = dto.age;
      existingUser.twoFactorCode = twoFactorCode;
      existingUser.twoFactorExpiry = twoFactorExpiry;

      await existingUser.save();

      const tempToken = await this.jwtService.signAsync(
        { sub: existingUser._id.toString(), email: existingUser.email, type: '2FA' },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: '10m',
        },
      );

      // Send OTP email in background — do not block the response
      void this.emailService
        .sendTwoFactorCodeEmail(existingUser.email, existingUser.username, twoFactorCode)
        .catch((err: unknown) =>
          this.logger.error(`Failed to send OTP email to ${existingUser.email}: ${(err as Error)?.message}`),
        );

      return {
        requires2FA: true,
        tempToken,
        email: existingUser.email,
      };
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationToken = uuidv4();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.userModel.create({
      username: dto.username,
      email: dto.email.toLowerCase(),
      age: dto.age,
      password: hashedPassword,
      isVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpiry: verificationExpiry,
      twoFactorCode,
      twoFactorExpiry,
    });

    // Create default settings
    await this.settingsModel.create({ userId: user._id });

    const tempToken = await this.jwtService.signAsync(
      { sub: user._id.toString(), email: user.email, type: '2FA' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '10m',
      },
    );

    // Send OTP email in background — do not block the response
    void this.emailService
      .sendTwoFactorCodeEmail(user.email, user.username, twoFactorCode)
      .catch((err: unknown) =>
        this.logger.error(`Failed to send OTP email to ${user.email}: ${(err as Error)?.message}`),
      );

    return {
      requires2FA: true,
      tempToken,
      email: user.email,
    };
  }

  // ── Login ────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    await this.verifyCaptcha(dto.captchaToken, dto.captchaInput);

    const user = await this.userModel
      .findOne({ email: dto.email.toLowerCase() })
      .select('+password +twoFactorCode +twoFactorExpiry');

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const twoFactorCode = this.generateMixed2FACode();
    const twoFactorExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.emailService.sendTwoFactorCodeEmail(user.email, user.username, twoFactorCode);

    await this.userModel.findByIdAndUpdate(user._id, {
      twoFactorCode,
      twoFactorExpiry,
    });

    const tempToken = await this.jwtService.signAsync(
      { sub: user._id.toString(), email: user.email, rememberMe: !!dto.rememberMe, type: '2FA' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '10m',
      },
    );

    return {
      requires2FA: true,
      tempToken,
      email: user.email,
    };
  }

  // ── Verify 2FA ────────────────────────────────────────────────
  async verifyTwoFactor(tempToken: string, code: string) {
    let payload: { sub: string; email: string; rememberMe?: boolean; type: string };
    try {
      payload = await this.jwtService.verifyAsync(tempToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      if (payload.type !== '2FA' || !payload.sub) {
        throw new UnauthorizedException('Invalid 2FA session');
      }
    } catch {
      throw new UnauthorizedException('2FA session expired or invalid. Please sign in again.');
    }

    const user = await this.userModel
      .findById(payload.sub)
      .select('+twoFactorCode +twoFactorExpiry +refreshToken');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      !user.twoFactorCode ||
      !user.twoFactorExpiry ||
      user.twoFactorExpiry < new Date() ||
      user.twoFactorCode.toUpperCase() !== code.trim().toUpperCase()
    ) {
      throw new BadRequestException('Invalid or expired 2FA code');
    }

    // Clear 2FA code, set isVerified: true, and mark online
    await this.userModel.findByIdAndUpdate(user._id, {
      twoFactorCode: null,
      twoFactorExpiry: null,
      isVerified: true,
      onlineStatus: 'online',
    });

    const tokens = await this.generateTokens(user);
    const hashedToken = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await this.userModel.findByIdAndUpdate(user._id, { refreshToken: hashedToken });

    return {
      user: this.sanitizeUser(user),
      tokens,
      rememberMe: payload.rememberMe,
    };
  }

  // ── Resend 2FA ────────────────────────────────────────────────
  async resendTwoFactor(tempToken: string) {
    let payload: { sub: string; email: string; type: string };
    try {
      payload = await this.jwtService.verifyAsync(tempToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      if (payload.type !== '2FA' || !payload.sub) {
        throw new UnauthorizedException('Invalid 2FA session');
      }
    } catch {
      throw new UnauthorizedException('2FA session expired. Please sign in again.');
    }

    const user = await this.userModel.findById(payload.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const twoFactorCode = this.generateMixed2FACode();
    const twoFactorExpiry = new Date(Date.now() + 10 * 60 * 1000);

    try {
      await this.emailService.sendTwoFactorCodeEmail(user.email, user.username, twoFactorCode);
    } catch (err: unknown) {
      throw new BadRequestException(
        `Failed to send OTP email: ${(err as Error)?.message || 'SMTP error'}. Please verify email configuration.`,
      );
    }

    await this.userModel.findByIdAndUpdate(user._id, {
      twoFactorCode,
      twoFactorExpiry,
    });

    return { message: 'A new 2FA code has been sent to your email.' };
  }

  // ── Logout ───────────────────────────────────────────────────
  async logout(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: null,
      onlineStatus: 'offline',
      lastSeen: new Date(),
    });
    return { message: 'Logged out successfully' };
  }

  // ── Refresh Tokens ────────────────────────────────────────────
  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.userModel.findById(userId).select('+refreshToken');
    if (!user?.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    let tokenMatch = false;
    if (user.refreshToken.startsWith('$2a$') || user.refreshToken.startsWith('$2b$')) {
      tokenMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    } else {
      const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');
      tokenMatch = hashed === user.refreshToken;
    }

    if (!tokenMatch) {
      throw new UnauthorizedException('Access denied — invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    const hashedToken = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await this.userModel.findByIdAndUpdate(userId, { refreshToken: hashedToken });
    return tokens;
  }

  // ── Forgot Password ───────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase() });

    if (!user) {
      return { message: 'If that email exists, a reset link has been sent' };
    }

    const resetToken = uuidv4();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await this.userModel.findByIdAndUpdate(user._id, {
      passwordResetToken: resetToken,
      passwordResetExpiry: resetExpiry,
    });

    await this.emailService
      .sendPasswordResetEmail(user.email, user.username, resetToken)
      .catch((err: unknown) => console.error('Failed to send password reset email:', err));

    return { message: 'If that email exists, a reset link has been sent' };
  }

  // ── Reset Password ────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userModel
      .findOne({
        passwordResetToken: dto.token,
        passwordResetExpiry: { $gt: new Date() },
      })
      .select('+passwordResetToken +passwordResetExpiry');

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.userModel.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null,
      refreshToken: null,
    });

    return { message: 'Password reset successfully' };
  }

  // ── Verify Email ─────────────────────────────────────────────
  async verifyEmail(token: string) {
    const user = await this.userModel
      .findOne({
        emailVerificationToken: token,
        emailVerificationExpiry: { $gt: new Date() },
      })
      .select('+emailVerificationToken +emailVerificationExpiry');

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.userModel.findByIdAndUpdate(user._id, {
      isVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    });

    return { message: 'Email verified successfully' };
  }

  // ── Get Current User ──────────────────────────────────────────
  async getMe(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return this.sanitizeUser(user);
  }

  // ── Helpers ───────────────────────────────────────────────────
  private async generateTokens(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    await this.userModel.findByIdAndUpdate(userId, { refreshToken: hashedToken });
  }

  private sanitizeUser(user: UserDocument) {
    const obj = user.toObject();
    delete obj.password;
    delete obj.refreshToken;
    delete obj.emailVerificationToken;
    delete obj.emailVerificationExpiry;
    delete obj.passwordResetToken;
    delete obj.passwordResetExpiry;
    delete obj.twoFactorCode;
    delete obj.twoFactorExpiry;
    return obj;
  }
}
