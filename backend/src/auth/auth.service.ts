import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
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

  // ── Register ────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existingUser = await this.userModel.findOne({
      $or: [{ email: dto.email.toLowerCase() }, { username: dto.username }],
    });

    if (existingUser) {
      throw new ConflictException(
        existingUser.email === dto.email.toLowerCase()
          ? 'Email already registered'
          : 'Username already taken',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const verificationToken = uuidv4();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.userModel.create({
      username: dto.username,
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      emailVerificationToken: verificationToken,
      emailVerificationExpiry: verificationExpiry,
    });

    // Create default settings
    await this.settingsModel.create({ userId: user._id });

    // Send verification email (non-blocking)
    this.emailService
      .sendVerificationEmail(user.email, user.username, verificationToken)
      .catch((err: unknown) => console.error('Failed to send verification email:', err));

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  // ── Login ────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.userModel
      .findOne({ email: dto.email.toLowerCase() })
      .select('+password +refreshToken');

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

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    // Update online status
    await this.userModel.findByIdAndUpdate(user._id, { onlineStatus: 'online' });

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
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

    const tokenMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!tokenMatch) {
      throw new UnauthorizedException('Access denied — invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(userId, tokens.refreshToken);
    return tokens;
  }

  // ── Forgot Password ───────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase() });

    // Always return success to prevent email enumeration
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
    return obj;
  }
}
