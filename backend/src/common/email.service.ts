import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromAddress = 'Interlude <b440c5001@smtp-brevo.com>';

  constructor(private configService: ConfigService) {
    const user = configService.get<string>('BREVO_SMTP_LOGIN');
    const pass = configService.get<string>('BREVO_SMTP_KEY');

    this.transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: { user, pass },
    });

    this.logger.log(`📧 Email service ready via Brevo SMTP`);
  }

  async sendVerificationEmail(email: string, username: string, token: string) {
    const appUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000';
    const verificationUrl = `${appUrl}/auth/verify-email?token=${token}`;
    await this.transporter.sendMail({
      from: this.fromAddress,
      to: email,
      subject: 'Verify your INTERLUDE account',
      html: this.buildVerificationEmailHtml(username, verificationUrl),
    });
  }

  async sendPasswordResetEmail(email: string, username: string, token: string) {
    const appUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000';
    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;
    await this.transporter.sendMail({
      from: this.fromAddress,
      to: email,
      subject: 'Reset your INTERLUDE password',
      html: this.buildPasswordResetEmailHtml(username, resetUrl),
    });
  }

  async sendTwoFactorCodeEmail(email: string, username: string, code: string) {
    this.logger.log(`🔑 Sending OTP ${code} to ${email}`);
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject: `Your INTERLUDE Security Code: ${code}`,
        html: this.buildTwoFactorEmailHtml(username, code),
      });
      this.logger.log(`✅ OTP email sent to ${email}`);
    } catch (err: unknown) {
      this.logger.error(`❌ OTP email failed for ${email}: ${(err as Error)?.message}`);
    }
  }

  async sendWatchInviteEmail(email: string, fromUsername: string, movieTitle: string, sessionId: string) {
    const appUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000';
    const sessionUrl = `${appUrl}/watch/${sessionId}`;
    await this.transporter.sendMail({
      from: this.fromAddress,
      to: email,
      subject: `${fromUsername} invited you to watch ${movieTitle} on INTERLUDE`,
      html: `<div style="background:#0A0A0A;color:#fff;padding:40px;font-family:sans-serif;">
        <h1 style="color:#3B82F6;">🎬 INTERLUDE</h1>
        <p><strong>${fromUsername}</strong> has invited you to watch <strong>${movieTitle}</strong> together.</p>
        <a href="${sessionUrl}" style="background:#2563EB;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Join Watch Party</a>
      </div>`,
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
