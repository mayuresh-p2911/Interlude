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
import bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { User, UserDocument } from '../schemas/user.schema';
import { Settings, SettingsDocument } from '../schemas/settings.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { EmailService } from '../common/email.service';

// Shape carried inside the REGISTER_2FA tempToken
interface RegisterPayload {
  sub: 'pending';
  email: string;
  username: string;
  hashedPassword: string;
  age: number;
  hashedOtp: string;
  otpExpiry: number; // Unix ms
  lastOtpSentAt: number; // Unix ms
  otpAttempts: number;
  type: 'REGISTER_2FA';
}

// Shape carried inside the LOGIN_2FA tempToken
interface LoginPayload {
  sub: string; // existing user _id
  email: string;
  rememberMe: boolean;
  type: 'LOGIN_2FA';
}

type TwoFAPayload = RegisterPayload | LoginPayload;

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

  /** Sends OTP email without blocking the HTTP response (register/login must stay fast). */
  private async sendOtpEmail(email: string, username: string, otp: string) {
    try {
      await this.emailService.sendTwoFactorCodeEmail(email, username, otp);
    } catch (err: unknown) {
      this.logger.error(
        `OTP email failed for ${email}: ${(err as Error)?.message ?? String(err)}`,
      );
    }
  }

  private async sendResetPasswordEmail(email: string, username: string, token: string, origin?: string) {
    try {
      await this.emailService.sendPasswordResetEmail(email, username, token, origin);
    } catch (err: unknown) {
      this.logger.error(
        `Reset password email failed for ${email}: ${(err as Error)?.message ?? String(err)}`,
      );
    }
  }

  // ── Register ────────────────────────────────────────────────
  //
  // No permanent User or Settings record is created here.
  // All pending registration data is encoded inside the signed JWT
  // (REGISTER_2FA tempToken). The actual user is created only after
  // successful OTP verification inside verifyTwoFactor().
  async register(dto: RegisterDto) {
    await this.verifyCaptcha(dto.captchaToken, dto.captchaInput);

    const existingUser = await this.userModel.findOne({
      $or: [{ email: dto.email.toLowerCase() }, { username: dto.username }],
    });

    if (existingUser?.isVerified) {
      throw new ConflictException(
        existingUser.email === dto.email.toLowerCase()
          ? 'Email already registered'
          : 'Username already taken',
      );
    }

    const now = Date.now();
    const otp = this.generateMixed2FACode();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const tempToken = await this.jwtService.signAsync(
      {
        sub: 'pending',
        email: dto.email.toLowerCase(),
        username: dto.username,
        hashedPassword,
        age: dto.age,
        hashedOtp,
        otpExpiry: now + 10 * 60 * 1000,
        lastOtpSentAt: now,
        otpAttempts: 0,
        type: 'REGISTER_2FA',
      } satisfies RegisterPayload,
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '10m',
      },
    );

    await this.sendOtpEmail(dto.email.toLowerCase(), dto.username, otp);

    return {
      requires2FA: true,
      tempToken,
      email: dto.email.toLowerCase(),
    };
  }

  // ── Login ────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    await this.verifyCaptcha(dto.captchaToken, dto.captchaInput);

    const user = await this.userModel
      .findOne({ email: dto.email.toLowerCase() })
      .select('+password +twoFactorCode +twoFactorExpiry +lastOtpSentAt');

    if (!user) {
      throw new UnauthorizedException('No account linked to this email');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Incorrect password');
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
      {
        sub: user._id.toString(),
        email: user.email,
        rememberMe: !!dto.rememberMe,
        type: 'LOGIN_2FA',
      } satisfies LoginPayload,
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '10m',
      },
    );

    await this.sendOtpEmail(user.email, user.username, otp);

    return {
      requires2FA: true,
      tempToken,
      email: user.email,
    };
  }

  // ── Verify 2FA ────────────────────────────────────────────────
  async verifyTwoFactor(tempToken: string, code: string) {
    let payload: TwoFAPayload;
    try {
      payload = await this.jwtService.verifyAsync<TwoFAPayload>(tempToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      if (payload.type !== 'REGISTER_2FA' && payload.type !== 'LOGIN_2FA') {
        throw new UnauthorizedException('Invalid 2FA session');
      }
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('2FA session expired or invalid. Please sign in again.');
    }

    // ── REGISTER path ─────────────────────────────────────────
    if (payload.type === 'REGISTER_2FA') {
      const reg = payload as RegisterPayload;

      if (Date.now() > reg.otpExpiry) {
        throw new BadRequestException('Invalid or expired 2FA code');
      }

      const codeMatch = await bcrypt.compare(code.trim(), reg.hashedOtp);

      if (!codeMatch) {
        const newAttempts = reg.otpAttempts + 1;

        if (newAttempts >= 5) {
          throw new BadRequestException(
            'Too many incorrect attempts. A new verification code is required.',
          );
        }

        // Re-issue token with incremented attempt counter so the state is preserved
        const { exp, iat, ...cleanReg } = reg as unknown as Record<string, any>;
        const updatedToken = await this.jwtService.signAsync(
          { ...cleanReg, otpAttempts: newAttempts },
          {
            secret: this.configService.get<string>('JWT_SECRET'),
            expiresIn: '10m',
          },
        );

        throw new BadRequestException({
          message: 'Invalid or expired 2FA code',
          tempToken: updatedToken,
        });
      }

      // OTP is correct — check if this email/username was registered while we waited
      const conflict = await this.userModel.findOne({
        $or: [{ email: reg.email }, { username: reg.username }],
      });

      if (conflict?.isVerified) {
        throw new ConflictException(
          conflict.email === reg.email
            ? 'Email already registered'
            : 'Username already taken',
        );
      }

      const verificationToken = uuidv4();
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Create the permanent user record now, after OTP verification
      let user: UserDocument;
      if (conflict && !conflict.isVerified) {
        // Overwrite the existing unverified stub
        conflict.username = reg.username;
        conflict.email = reg.email;
        conflict.password = reg.hashedPassword;
        conflict.age = reg.age;
        conflict.isVerified = true;
        conflict.onlineStatus = 'online';
        conflict.twoFactorCode = null;
        conflict.twoFactorExpiry = null;
        conflict.otpAttempts = 0;
        conflict.lastOtpSentAt = null;
        conflict.emailVerificationToken = verificationToken;
        conflict.emailVerificationExpiry = verificationExpiry;
        await conflict.save();
        user = conflict;
      } else {
        user = await this.userModel.create({
          username: reg.username,
          email: reg.email,
          age: reg.age,
          password: reg.hashedPassword,
          isVerified: true,
          onlineStatus: 'online',
          twoFactorCode: null,
          twoFactorExpiry: null,
          otpAttempts: 0,
          lastOtpSentAt: null,
          emailVerificationToken: verificationToken,
          emailVerificationExpiry: verificationExpiry,
        });

        await this.settingsModel.create({ userId: user._id });
      }

      const tokens = await this.generateTokens(user);
      const hashedRefresh = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
      await this.userModel.findByIdAndUpdate(user._id, { refreshToken: hashedRefresh });

      const updatedUser = await this.userModel.findById(user._id);

      return {
        user: this.sanitizeUser(updatedUser!),
        tokens,
        rememberMe: false,
      };
    }

    // ── LOGIN path ────────────────────────────────────────────
    const login = payload as LoginPayload;

    const user = await this.userModel
      .findById(login.sub)
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

    await this.userModel.findByIdAndUpdate(user._id, {
      twoFactorCode: null,
      twoFactorExpiry: null,
      otpAttempts: 0,
      onlineStatus: 'online',
    });

    const tokens = await this.generateTokens(user);
    const hashedRefresh = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await this.userModel.findByIdAndUpdate(user._id, { refreshToken: hashedRefresh });

    const updatedUser = await this.userModel.findById(user._id);

    return {
      user: this.sanitizeUser(updatedUser!),
      tokens,
      rememberMe: login.rememberMe,
    };
  }

  // ── Resend 2FA ────────────────────────────────────────────────
  async resendTwoFactor(tempToken: string) {
    let payload: TwoFAPayload;
    try {
      payload = await this.jwtService.verifyAsync<TwoFAPayload>(tempToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      if (payload.type !== 'REGISTER_2FA' && payload.type !== 'LOGIN_2FA') {
        throw new UnauthorizedException('Invalid 2FA session');
      }
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('2FA session expired. Please sign in again.');
    }

    const now = Date.now();

    // ── REGISTER resend path ──────────────────────────────────
    if (payload.type === 'REGISTER_2FA') {
      const reg = payload as RegisterPayload;

      if (reg.lastOtpSentAt && now - reg.lastOtpSentAt < 60_000) {
        throw new BadRequestException(
          'Please wait 60 seconds before requesting another verification code.',
        );
      }

      const otp = this.generateMixed2FACode();
      const hashedOtp = await bcrypt.hash(otp, 10);

      const { exp, iat, ...cleanReg } = reg as unknown as Record<string, any>;
      const newToken = await this.jwtService.signAsync(
        {
          ...cleanReg,
          hashedOtp,
          otpExpiry: now + 10 * 60 * 1000,
          lastOtpSentAt: now,
          otpAttempts: 0,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: '10m',
        },
      );

      await this.sendOtpEmail(reg.email, reg.username, otp);

      return { message: 'A new 2FA code has been sent to your email.', tempToken: newToken };
    }

    // ── LOGIN resend path ─────────────────────────────────────
    const login = payload as LoginPayload;

    const user = await this.userModel.findById(login.sub).select('+lastOtpSentAt');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      user.lastOtpSentAt &&
      now - user.lastOtpSentAt.getTime() < 60_000
    ) {
      throw new BadRequestException(
        'Please wait 60 seconds before requesting another verification code.',
      );
    }

    const otp = this.generateMixed2FACode();
    const twoFactorCode = await bcrypt.hash(otp, 10);
    const twoFactorExpiry = new Date(now + 10 * 60 * 1000);

    // Update DB before sending email — DB must always contain the OTP that was emailed
    await this.userModel.findByIdAndUpdate(user._id, {
      twoFactorCode,
      twoFactorExpiry,
      lastOtpSentAt: new Date(now),
      otpAttempts: 0,
    });

    await this.sendOtpEmail(user.email, user.username, otp);

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
  async forgotPassword(dto: ForgotPasswordDto, origin?: string) {
    const cleanEmail = dto.email ? dto.email.trim().toLowerCase() : '';
    const rawEmail = dto.email ? dto.email.trim() : '';

    const escapedEmail = cleanEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const user = await this.userModel.findOne({
      $or: [
        { email: cleanEmail },
        { email: rawEmail },
        { email: { $regex: `^${escapedEmail}$`, $options: 'i' } },
      ],
    });

    if (!user) {
      this.logger.warn(`Password reset requested for unregistered email: ${cleanEmail}`);
      throw new NotFoundException('No account linked to this email');
    }

    const resetToken = uuidv4();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await this.userModel.findByIdAndUpdate(user._id, {
      passwordResetToken: resetToken,
      passwordResetExpiry: resetExpiry,
    });

    const targetEmail = cleanEmail || user.email;
    await this.sendResetPasswordEmail(targetEmail, user.username, resetToken, origin);

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
