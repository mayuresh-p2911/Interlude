import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleDestroy {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);
  private fromAddress: string;
  private readonly isDev: boolean;

  constructor(private configService: ConfigService) {
    this.isDev = this.configService.get<string>('NODE_ENV') !== 'production';

    const smtpUser = (
      this.configService.get<string>('SMTP_USER') ||
      this.configService.get<string>('EMAIL_USER') ||
      'interlude209@gmail.com'
    ).trim();

    const smtpPass = (
      this.configService.get<string>('SMTP_PASSWORD') ||
      this.configService.get<string>('EMAIL_PASS') ||
      'htjf tuyt lmjc zrcm'
    ).replace(/\s+/g, '').trim();

    const smtpHost = (
      this.configService.get<string>('SMTP_HOST') ||
      'smtp.gmail.com'
    ).trim();

    const smtpPort = Number(this.configService.get<number>('SMTP_PORT')) || 465;

    this.fromAddress =
      this.configService.get<string>('EMAIL_FROM')?.trim() || `INTERLUDE <${smtpUser}>`;

    const isGmail =
      smtpUser.toLowerCase().endsWith('@gmail.com') ||
      smtpHost.toLowerCase().includes('gmail.com');

    this.transporter = nodemailer.createTransport(
      isGmail
        ? {
            service: 'gmail',
            auth: { user: smtpUser, pass: smtpPass },
            tls: { rejectUnauthorized: false },
          }
        : {
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass },
            tls: { rejectUnauthorized: false },
          },
    );
    this.logger.log(`📧 Email service initialized via ${isGmail ? 'Gmail SMTP' : smtpHost}`);
  }

  onModuleDestroy() {
    this.transporter.close();
  }

  async sendVerificationEmail(email: string, username: string, token: string) {
    const appUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000';
    const verificationUrl = `${appUrl}/auth/verify-email?token=${token}`;
    await this.deliverMail({
      to: email,
      subject: 'Verify your INTERLUDE account',
      html: this.buildVerificationEmailHtml(username, verificationUrl),
    });
  }

  async sendPasswordResetEmail(email: string, username: string, token: string) {
    const appUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000';
    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;
    await this.deliverMail({
      to: email,
      subject: 'Reset your INTERLUDE password',
      html: this.buildPasswordResetEmailHtml(username, resetUrl),
    });
  }

  async sendTwoFactorCodeEmail(email: string, username: string, code: string) {
    this.logOtpToConsole(email, code);

    try {
      const info = await this.deliverMail(
        {
          to: email,
          subject: `Your INTERLUDE Security Code: ${code}`,
          text: `Hi ${username || 'there'}, your INTERLUDE verification code is: ${code}. It expires in 10 minutes.`,
          html: this.buildTwoFactorEmailHtml(username, code),
        },
        15_000,
      );
      this.logger.log(`✉️ OTP email dispatched to ${email}: ${info.messageId}`);

      this.logger.log(`✉️ OTP email dispatched to ${email}`);
    } catch (error) {
      this.logger.warn(
        `⚠️ Could not send OTP email to ${email}: ${(error as Error)?.message ?? String(error)}. (Code logged in console above)`,
      );
    }
  }

  async sendWatchInviteEmail(
    email: string,
    fromUsername: string,
    movieTitle: string,
    sessionId: string,
  ) {
    const appUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000';
    const sessionUrl = `${appUrl}/watch/${sessionId}`;
    await this.deliverMail({
      to: email,
      subject: `${fromUsername} invited you to watch ${movieTitle} on INTERLUDE`,
      html: `<div style="background:#0A0A0A;color:#fff;padding:40px;font-family:sans-serif;">
        <h1 style="color:#3B82F6;">🎬 INTERLUDE</h1>
        <p><strong>${fromUsername}</strong> has invited you to watch <strong>${movieTitle}</strong> together.</p>
        <a href="${sessionUrl}" style="background:#2563EB;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Join Watch Party</a>
      </div>`,
    });
  }

  private logOtpToConsole(email: string, code: string) {
    this.logger.log(`🔑 [OTP CODE FOR ${email}]: ${code}`);
    this.logger.log('╔══════════════════════════════════════════════════╗');
    this.logger.log(`║  INTERLUDE verification code for ${email}`);
    this.logger.log(`║  CODE: ${code}`);
    this.logger.log('╚══════════════════════════════════════════════════╝');
  }

  private async deliverMail(
    options: { to: string; subject: string; html: string; text?: string },
    timeoutMs = 15_000,
  ) {
    return new Promise<nodemailer.SentMessageInfo>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`SMTP timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.transporter
        .sendMail({
          from: this.fromAddress,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        })
        .then((info) => {
          clearTimeout(timer);
          resolve(info);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private buildVerificationEmailHtml(username: string, url: string): string {
    return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:'Segoe UI',sans-serif;">
      <div style="max-width:600px;margin:40px auto;background:#081B33;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2563EB,#081B33);padding:40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:32px;letter-spacing:4px;">INTERLUDE</h1>
          <p style="color:#60A5FA;margin:8px 0 0;">Watch Together. Stay Together.</p>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#fff;">Welcome, ${username}! 🎬</h2>
          <p style="color:#94A3B8;line-height:1.6;">Thank you for joining INTERLUDE. Click the button below to verify your email address.</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${url}" style="background:#2563EB;color:#fff;padding:16px 32px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">Verify Email Address</a>
          </div>
          <p style="color:#64748B;font-size:14px;">This link expires in 24 hours.</p>
        </div>
      </div></body></html>`;
  }

  private buildPasswordResetEmailHtml(username: string, url: string): string {
    return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:'Segoe UI',sans-serif;">
      <div style="max-width:600px;margin:40px auto;background:#081B33;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2563EB,#081B33);padding:40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:32px;letter-spacing:4px;">INTERLUDE</h1>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#fff;">Password Reset Request</h2>
          <p style="color:#94A3B8;line-height:1.6;">Hi ${username}, click below to reset your password.</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${url}" style="background:#2563EB;color:#fff;padding:16px 32px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">Reset Password</a>
          </div>
          <p style="color:#64748B;font-size:14px;">This link expires in 1 hour.</p>
        </div>
      </div></body></html>`;
  }

  private buildTwoFactorEmailHtml(username: string, code: string): string {
    return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0A;font-family:'Segoe UI',sans-serif;">
      <div style="max-width:600px;margin:40px auto;background:#081B33;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
        <div style="background:linear-gradient(135deg,#2563EB,#081B33);padding:36px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:32px;letter-spacing:4px;">INTERLUDE</h1>
          <p style="color:#60A5FA;margin:8px 0 0;font-size:14px;">Two-Factor Security Verification</p>
        </div>
        <div style="padding:40px;text-align:center;">
          <h2 style="color:#fff;margin-top:0;">Authentication Code</h2>
          <p style="color:#94A3B8;line-height:1.6;font-size:15px;">Hi ${username}, use the code below to complete verification:</p>
          <div style="margin:32px 0;">
            <span style="background:rgba(37,99,235,0.15);border:2px dashed #2563EB;color:#60A5FA;font-size:36px;font-weight:800;letter-spacing:10px;padding:16px 32px;border-radius:12px;display:inline-block;font-family:monospace;">${code}</span>
          </div>
          <p style="color:#64748B;font-size:14px;margin-bottom:0;">Expires in <strong>10 minutes</strong>.</p>
        </div>
      </div></body></html>`;
  }
}


