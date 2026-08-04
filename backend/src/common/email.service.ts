import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as https from 'https';

@Injectable()
export class EmailService implements OnModuleDestroy {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);
  private fromAddress: string;
  private readonly consoleOnly: boolean;
  private readonly isDev: boolean;

  constructor(private configService: ConfigService) {
    this.isDev = this.configService.get<string>('NODE_ENV') !== 'production';

    const resendApiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    const sendgridApiKey = this.configService.get<string>('SENDGRID_API_KEY')?.trim();
    const brevoApiKey = this.configService.get<string>('BREVO_API_KEY')?.trim();

    if (resendApiKey || sendgridApiKey || brevoApiKey) {
      this.consoleOnly = false;
      this.fromAddress =
        this.configService.get<string>('EMAIL_FROM')?.trim() || 'INTERLUDE <onboarding@resend.dev>';
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      const apiMode = resendApiKey ? 'Resend' : sendgridApiKey ? 'SendGrid' : 'Brevo';
      this.logger.log(
        `📧 Email service ready (API Mode: ${apiMode})`,
      );
      return;
    }

    const smtpUser = (
      this.configService.get<string>('EMAIL_USER') ||
      this.configService.get<string>('SMTP_USER') ||
      'interlude209@gmail.com'
    ).trim();

    const smtpPass = (
      this.configService.get<string>('EMAIL_PASS') ||
      this.configService.get<string>('SMTP_PASSWORD') ||
      'htjf tuyt lmjc zrcm'
    ).trim();

    const configuredHost = (this.configService.get<string>('SMTP_HOST') || '').trim();
    const smtpPort = this.configService.get<number>('SMTP_PORT') ?? 587;
    const secure =
      this.configService.get<string>('SMTP_SECURE') === 'true' || smtpPort === 465;

    const isUsingFallback = smtpUser === 'interlude209@gmail.com';

    // Use built-in Gmail config if using fallback credentials, or if it is Gmail and port is not 587
    const smtpService = (
      this.configService.get<string>('SMTP_SERVICE') ||
      this.configService.get<string>('EMAIL_SERVICE') ||
      (isUsingFallback || (smtpPort !== 587 && (smtpUser.toLowerCase().endsWith('@gmail.com') || configuredHost.toLowerCase().includes('gmail.com'))) ? 'gmail' : '')
    ).trim();

    const smtpHost = configuredHost || (smtpUser && !smtpService ? 'smtp.gmail.com' : '');

    // Ensure the fromAddress aligns with the SMTP user if using Gmail or fallback credentials to prevent SMTP rejection.
    const isGmail = smtpService === 'gmail' || smtpUser.toLowerCase().endsWith('@gmail.com');

    this.fromAddress =
      isUsingFallback || isGmail
        ? `INTERLUDE <${smtpUser}>`
        : this.configService.get<string>('EMAIL_FROM')?.trim() || `INTERLUDE <${smtpUser}>`;

    if (!smtpService && (!smtpHost || !smtpUser || !smtpPass)) {
      this.consoleOnly = true;
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      this.logger.warn(
        '📧 Email: SMTP not configured (set EMAIL_USER + EMAIL_PASS or SMTP_*). OTP codes are logged in this terminal only.',
      );
      return;
    }

    this.consoleOnly = false;

    // Reject unauthorized certs is disabled in dev to bypass local antivirus/proxy SSL inspection blocks
    const tlsConfig = {
      minVersion: 'TLSv1.2',
      ...(this.isDev ? { rejectUnauthorized: false } : {}),
    };

    const transportConfig: any = smtpService
      ? { service: smtpService, tls: tlsConfig }
      : {
          host: smtpHost,
          port: smtpPort,
          secure,
          ...(smtpPort === 587 && !secure
            ? { requireTLS: true, tls: tlsConfig }
            : {}),
        };

    this.transporter = nodemailer.createTransport({
      ...transportConfig,
      auth: { user: smtpUser, pass: smtpPass },
      // Connection pooling disabled to prevent connection drop hangs on long-idle states
      pool: false,
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    void this.transporter
      .verify()
      .then(() => {
        const infoStr = smtpService ? `service: ${smtpService}` : `${smtpHost}:${smtpPort}`;
        this.logger.log(`📧 Email service ready (${infoStr} as ${smtpUser})`);
      })
      .catch((err: unknown) => {
        this.logger.warn(
          `📧 Email SMTP verify failed — sends will retry. ${(err as Error)?.message ?? String(err)}`,
        );
      });
  }

  onModuleDestroy() {
    if (!this.consoleOnly) {
      this.transporter.close();
    }
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
    if (this.isDev) {
      this.logOtpToConsole(email, code);
    }

    if (this.consoleOnly) {
      return;
    }

    try {
      await this.deliverMail(
        {
          to: email,
          subject: `Your INTERLUDE Security Code: ${code}`,
          text: `Hi ${username || 'there'}, your INTERLUDE verification code is: ${code}. It expires in 10 minutes.`,
          html: this.buildTwoFactorEmailHtml(username, code),
        },
        20_000,
      );
      this.logger.log(`✉️ OTP email dispatched to ${email}`);
    } catch (error) {
      this.logger.error(
        `❌ SMTP could not deliver OTP to ${email}: ${(error as Error)?.message ?? String(error)}`,
      );
      this.logOtpToConsole(email, code);
      if (this.isDev) {
        return;
      }
      throw error;
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
    this.logger.log('');
    this.logger.log('╔══════════════════════════════════════════════════╗');
    this.logger.log(`║  INTERLUDE verification code for ${email}`);
    this.logger.log(`║  CODE: ${code}`);
    this.logger.log('╚══════════════════════════════════════════════════╝');
    this.logger.log('');
  }

  private async deliverMail(
    options: { to: string; subject: string; html: string; text?: string },
    timeoutMs = 25_000,
  ) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    const sendgridApiKey = this.configService.get<string>('SENDGRID_API_KEY')?.trim();
    const brevoApiKey = this.configService.get<string>('BREVO_API_KEY')?.trim();

    if (brevoApiKey) {
      try {
        const fromEmail = this.fromAddress.match(/<([^>]+)>/)?.[1] || this.fromAddress;
        const res = await this.postHttps(
          'https://api.brevo.com/v3/smtp/email',
          {
            accept: 'application/json',
            'content-type': 'application/json',
            'api-key': brevoApiKey,
          },
          {
            sender: { name: 'INTERLUDE', email: fromEmail },
            to: [{ email: options.to }],
            subject: options.subject,
            htmlContent: options.html,
          },
        );

        if (res.status < 200 || res.status >= 300) {
          throw new Error(`Brevo API returned status ${res.status}: ${res.data}`);
        }
        this.logger.log(`✉️ Email sent via Brevo API to ${options.to}`);
        return;
      } catch (err) {
        this.logger.error(`Brevo API failed: ${(err as Error).message}`);
      }
    }

    if (resendApiKey) {
      try {
        const fromEmail = (this.fromAddress.includes('resend.dev') || this.fromAddress.includes('interlude.app'))
          ? 'onboarding@resend.dev'
          : this.fromAddress;

        const res = await this.postHttps(
          'https://api.resend.com/emails',
          {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          {
            from: fromEmail,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
          },
        );

        if (res.status < 200 || res.status >= 300) {
          throw new Error(`Resend API returned status ${res.status}: ${res.data}`);
        }
        this.logger.log(`✉️ Email sent via Resend API to ${options.to}`);
        return;
      } catch (err) {
        this.logger.error(`Resend API failed: ${(err as Error).message}`);
      }
    }

    if (sendgridApiKey) {
      try {
        const fromEmail = this.fromAddress.match(/<([^>]+)>/)?.[1] || this.fromAddress;
        const res = await this.postHttps(
          'https://api.sendgrid.com/v3/mail/send',
          {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sendgridApiKey}`,
          },
          {
            personalizations: [{ to: [{ email: options.to }] }],
            from: { email: fromEmail, name: 'INTERLUDE' },
            subject: options.subject,
            content: [
              { type: 'text/html', value: options.html },
              ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
            ],
          },
        );

        if (res.status < 200 || res.status >= 300) {
          throw new Error(`SendGrid API returned status ${res.status}: ${res.data}`);
        }
        this.logger.log(`✉️ Email sent via SendGrid API to ${options.to}`);
        return;
      } catch (err) {
        this.logger.error(`SendGrid API failed: ${(err as Error).message}`);
      }
    }

    try {
      await this.sendWithTimeout(
        {
          from: this.fromAddress,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        },
        timeoutMs,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send "${options.subject}" to ${options.to}: ${(error as Error)?.message ?? String(error)}`,
      );
      throw error;
    }
  }

  private postHttps(
    url: string,
    headers: Record<string, string>,
    body: any,
  ): Promise<{ status: number; data: string }> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const reqData = JSON.stringify(body);

      const req = https.request(
        {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'POST',
          headers: {
            ...headers,
            'Content-Length': Buffer.byteLength(reqData),
          },
          timeout: 10_000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({ status: res.statusCode ?? 200, data });
          });
        },
      );

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy(new Error('HTTPS request timed out'));
      });

      req.write(reqData);
      req.end();
    });
  }

  private sendWithTimeout(
    options: nodemailer.SendMailOptions,
    timeoutMs: number,
  ): Promise<nodemailer.SentMessageInfo> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`SMTP timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.transporter
        .sendMail(options)
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
