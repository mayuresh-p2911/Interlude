import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
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
  private readonly logger = new Logger(AuthService.name);

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
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ── Register ────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    await this.verifyCaptcha(dto.captchaToken, dto.captchaInput);

    const existingUser = await this.userModel.findOne({
      $or: [{ email: dto.email.toLowerCase() }, { username: dto.username }],
    }).select('+lastOtpSentAt');

    const otp = this.generateMixed2FACode();
    const twoFactorCode = await bcrypt.hash(otp, 10);
    const twoFactorExpiry = new Date(Date.now() + 10 * 60 * 1000);
    const now = new Date();

    if (existingUser) {
      if (existingUser.isVerified) {
        throw new ConflictException(
          existingUser.email === dto.email.toLowerCase()
            ? 'Email already registered'
            : 'Username already taken',
        );
      }

      // Enforce resend cooldown
      if (
        existingUser.lastOtpSentAt &&
        now.getTime() - existingUser.lastOtpSentAt.getTime() < 60_000
      ) {
        throw new BadRequestException(
          'Please wait 60 seconds before requesting another verification code.',
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
      existingUser.lastOtpSentAt = now;
      existingUser.otpAttempts = 0;

      await existingUser.save();

      const tempToken = await this.jwtService.signAsync(
        { sub: existingUser._id.toString(), email: existingUser.email, type: 'REGISTER_2FA' },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: '10m',
        },
      );

      try {
        await this.emailService.sendTwoFactorCodeEmail(existingUser.email, existingUser.username, otp);
      } catch (error) {
        throw new BadRequestException(
          'Unable to send the verification code. Please try again.',
        );
      }

      return {
        requires2FA: true,
        tempToken,
        email: existingUser.email,
      };
    }

    // Check new user cooldown (not applicable for first-time registration, but included for consistency)
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
      lastOtpSentAt: now,
      otpAttempts: 0,
    });

    // Create default settings
    await this.settingsModel.create({ userId: user._id });

    const tempToken = await this.jwtService.signAsync(
      { sub: user._id.toString(), email: user.email, type: 'REGISTER_2FA' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '10m',
      },
    );

    try {
      await this.emailService.sendTwoFactorCodeEmail(user.email, user.username, otp);
    } catch (error) {
      throw new BadRequestException(
        'Unable to send the verification code. Please try again.',
      );
    }

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
      .select('+password +twoFactorCode +twoFactorExpiry +lastOtpSentAt');

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

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Please verify your email before signing in.',
      );
    }

    const now = new Date();

    if (
      user.lastOtpSentAt &&
      now.getTime() - user.lastOtpSentAt.getTime() < 60_000
    ) {
      throw new BadRequestException(
        'Please wait 60 seconds before requesting another verification code.',
      );
    }

    const otp = this.generateMixed2FACode();
    const twoFactorCode = await bcrypt.hash(otp, 10);
    const twoFactorExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.userModel.findByIdAndUpdate(user._id, {
      twoFactorCode,
      twoFactorExpiry,
      lastOtpSentAt: now,
      otpAttempts: 0,
    });

    const tempToken = await this.jwtService.signAsync(
      { sub: user._id.toString(), email: user.email, rememberMe: !!dto.rememberMe, type: 'LOGIN_2FA' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '10m',
      },
    );

    try {
      await this.emailService.sendTwoFactorCodeEmail(user.email, user.username, otp);
    } catch (error) {
      throw new BadRequestException(
        'Unable to send the verification code. Please try again.',
      );
    }

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
      if (
        (payload.type !== 'REGISTER_2FA' && payload.type !== 'LOGIN_2FA') ||
        !payload.sub
      ) {
        throw new UnauthorizedException('Invalid 2FA session');
      }
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('2FA session expired or invalid. Please sign in again.');
    }

    const user = await this.userModel
      .findById(payload.sub)
      .select('+twoFactorCode +twoFactorExpiry +refreshToken +otpAttempts');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorCode || !user.twoFactorExpiry || user.twoFactorExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired 2FA code');
    }

    const codeMatch = await bcrypt.compare(code.trim(), user.twoFactorCode);

    if (!codeMatch) {
      const newAttempts = (user.otpAttempts ?? 0) + 1;

      if (newAttempts >= 5) {
        await this.userModel.findByIdAndUpdate(user._id, {
          twoFactorCode: null,
          twoFactorExpiry: null,
          otpAttempts: 0,
        });
        throw new BadRequestException(
          'Too many incorrect attempts. A new verification code is required.',
        );
      }

      await this.userModel.findByIdAndUpdate(user._id, { otpAttempts: newAttempts });
      throw new BadRequestException('Invalid or expired 2FA code');
    }

    // OTP verified — build update based on token type
    const updatePayload: Record<string, unknown> = {
      twoFactorCode: null,
      twoFactorExpiry: null,
      otpAttempts: 0,
      onlineStatus: 'online',
    };

    if (payload.type === 'REGISTER_2FA') {
      updatePayload.isVerified = true;
    }

    await this.userModel.findByIdAndUpdate(user._id, updatePayload);

    const tokens = await this.generateTokens(user);
    const hashedToken = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await this.userModel.findByIdAndUpdate(user._id, { refreshToken: hashedToken });

    const updatedUser = await this.userModel.findById(user._id);

    return {
      user: this.sanitizeUser(updatedUser!),
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
      if (
        (payload.type !== 'REGISTER_2FA' && payload.type !== 'LOGIN_2FA') ||
        !payload.sub
      ) {
        throw new UnauthorizedException('Invalid 2FA session');
      }
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('2FA session expired. Please sign in again.');
    }

    const user = await this.userModel.findById(payload.sub).select('+lastOtpSentAt');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();

    if (
      user.lastOtpSentAt &&
      now.getTime() - user.lastOtpSentAt.getTime() < 60_000
    ) {
      throw new BadRequestException(
        'Please wait 60 seconds before requesting another verification code.',
      );
    }

    const otp = this.generateMixed2FACode();
    const twoFactorCode = await bcrypt.hash(otp, 10);
    const twoFactorExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Update DB before sending email — DB must always contain the OTP that was emailed
    await this.userModel.findByIdAndUpdate(user._id, {
      twoFactorCode,
      twoFactorExpiry,
      lastOtpSentAt: now,
      otpAttempts: 0,
    });

    try {
      await this.emailService.sendTwoFactorCodeEmail(user.email, user.username, otp);
    } catch (error) {
      throw new BadRequestException(
        'Unable to send the verification code. Please try again.',
      );
    }

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
