import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly isDev: boolean;

  constructor(private configService: ConfigService) {
    this.isDev = configService.get('NODE_ENV') !== 'production';

    if (this.isDev && !configService.get('SMTP_HOST')) {
      // Console transport for development — no SMTP server needed
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      this.logger.log('📧 Email service running in console mode (no SMTP configured)');
    } else {
      this.transporter = nodemailer.createTransport({
        host: configService.get<string>('SMTP_HOST'),
        port: configService.get<number>('SMTP_PORT') ?? 587,
        secure: false,
        auth: {
          user: configService.get<string>('SMTP_USER'),
          pass: configService.get<string>('SMTP_PASSWORD'),
        },
      });
    }
  }

  async sendVerificationEmail(email: string, username: string, token: string) {
    const appUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000';
    const verificationUrl = `${appUrl}/auth/verify-email?token=${token}`;

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM') ?? 'noreply@interlude.app',
      to: email,
      subject: 'Verify your INTERLUDE account',
      html: this.buildVerificationEmailHtml(username, verificationUrl),
    };

    await this.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(email: string, username: string, token: string) {
    const appUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000';
    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM') ?? 'noreply@interlude.app',
      to: email,
      subject: 'Reset your INTERLUDE password',
      html: this.buildPasswordResetEmailHtml(username, resetUrl),
    };

    await this.sendMail(mailOptions);
  }

  async sendTwoFactorCodeEmail(email: string, username: string, code: string) {
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM') ?? 'noreply@interlude.app',
      to: email,
      subject: `Your INTERLUDE Security Verification Code: ${code}`,
      html: this.buildTwoFactorEmailHtml(username, code),
    };

    await this.sendMail(mailOptions);
  }

  async sendWatchInviteEmail(email: string, fromUsername: string, movieTitle: string, sessionId: string) {
    const appUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000';
    const sessionUrl = `${appUrl}/watch/${sessionId}`;

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM') ?? 'noreply@interlude.app',
      to: email,
      subject: `${fromUsername} invited you to watch ${movieTitle} on INTERLUDE`,
      html: `
        <div style="background:#0A0A0A;color:#fff;padding:40px;font-family:sans-serif;">
          <h1 style="color:#3B82F6;">🎬 INTERLUDE</h1>
          <p><strong>${fromUsername}</strong> has invited you to watch <strong>${movieTitle}</strong> together.</p>
          <a href="${sessionUrl}" style="background:#2563EB;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Join Watch Party</a>
        </div>
      `,
    };

    await this.sendMail(mailOptions);
  }

  private async sendMail(options: nodemailer.SendMailOptions) {
    try {
      const info = await this.transporter.sendMail(options);
      if (this.isDev) {
        this.logger.log(`📧 Email (console mode):\nTo: ${options.to as string}\nSubject: ${options.subject as string}`);
      }
      return info;
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      throw error;
    }
  }

  private buildVerificationEmailHtml(username: string, url: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#0A0A0A;font-family:'Segoe UI',sans-serif;">
        <div style="max-width:600px;margin:40px auto;background:#081B33;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#2563EB,#081B33);padding:40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:32px;letter-spacing:4px;">INTERLUDE</h1>
            <p style="color:#60A5FA;margin:8px 0 0;">Watch Together. Stay Together.</p>
          </div>
          <div style="padding:40px;">
            <h2 style="color:#fff;">Welcome, ${username}! 🎬</h2>
            <p style="color:#94A3B8;line-height:1.6;">
              Thank you for joining INTERLUDE. Click the button below to verify your email address and start watching movies with friends.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${url}" style="background:#2563EB;color:#fff;padding:16px 32px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color:#64748B;font-size:14px;">
              This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private buildPasswordResetEmailHtml(username: string, url: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#0A0A0A;font-family:'Segoe UI',sans-serif;">
        <div style="max-width:600px;margin:40px auto;background:#081B33;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#2563EB,#081B33);padding:40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:32px;letter-spacing:4px;">INTERLUDE</h1>
          </div>
          <div style="padding:40px;">
            <h2 style="color:#fff;">Password Reset Request</h2>
            <p style="color:#94A3B8;line-height:1.6;">
              Hi ${username}, we received a request to reset your password. Click the button below to set a new one.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${url}" style="background:#2563EB;color:#fff;padding:16px 32px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color:#64748B;font-size:14px;">
              This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private buildTwoFactorEmailHtml(username: string, code: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#0A0A0A;font-family:'Segoe UI',sans-serif;">
        <div style="max-width:600px;margin:40px auto;background:#081B33;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
          <div style="background:linear-gradient(135deg,#2563EB,#081B33);padding:36px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:32px;letter-spacing:4px;">INTERLUDE</h1>
            <p style="color:#60A5FA;margin:8px 0 0;font-size:14px;">Two-Factor Security Verification</p>
          </div>
          <div style="padding:40px;text-align:center;">
            <h2 style="color:#fff;margin-top:0;">Authentication Code</h2>
            <p style="color:#94A3B8;line-height:1.6;font-size:15px;">
              Hi ${username}, use the following 6-character code to complete your verification:
            </p>
            <div style="margin:32px 0;">
              <span style="background:rgba(37,99,235,0.15);border:2px dashed #2563EB;color:#60A5FA;font-size:36px;font-weight:800;letter-spacing:10px;padding:16px 32px;border-radius:12px;display:inline-block;font-family:monospace;">
                ${code}
              </span>
            </div>
            <p style="color:#64748B;font-size:14px;margin-bottom:0;">
              This verification code will expire in <strong>10 minutes</strong>.<br/>
              If you did not attempt to sign in or sign up, please secure your account immediately.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

