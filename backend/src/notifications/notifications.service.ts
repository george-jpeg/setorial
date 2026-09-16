import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Resend } from 'resend';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);
    private readonly resend: Resend;
    private readonly globalFrom = process.env.EMAIL_FROM_ADDRESS || 'Setorial <onboarding@resend.dev>';
    private readonly supportRedirect = process.env.SUPPORT_REDIRECT_EMAIL || 'setorialltd@gmail.com';
    
    constructor(private prisma: PrismaService) {
        this.resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');
    }

    // Simple template renderer for HTML templates in backend/email_templates
    private async renderTemplate(filename: string, vars: Record<string, any> = {}): Promise<string> {
      try {
        const templatesDir = process.env.EMAIL_TEMPLATES_DIR || path.join(process.cwd(), 'backend', 'email_templates');
        const fullPath = path.join(templatesDir, filename);
        const raw = await fs.promises.readFile(fullPath, { encoding: 'utf8' });
        let out = raw;
        Object.keys(vars).forEach(k => {
          const re = new RegExp(`{{\\s*${k}\\s*}}`, 'gi');
          out = out.replace(re, String(vars[k] ?? ''));
        });
        // remove any unreplaced placeholders
        out = out.replace(/{{[^}]+}}/g, '');
        return out;
      } catch (err: any) {
        this.logger.error(`Failed to load email template ${filename}: ${err.message}`);
        return '';
      }
    }

    /**
     * Executes the email payload asynchronously (fire and forget)
     */
    private async executeEmailAsync(jobData: any): Promise<void> {
        try {
            if (jobData.batch) {
              const { data, error } = await this.resend.batch.send(jobData.batch);
              if (error) {
                this.logger.error(`Batch email send error: ${error.message}`);
                throw new Error(error.message);
              }
              this.logger.log(`Batch email job completed for ${jobData.batch.length} recipients.`);
              this.logger.debug(JSON.stringify(data));
            } else {
                const { error } = await this.resend.emails.send({
                    from: this.globalFrom,
                    to: jobData.to,
                    subject: jobData.subject,
                    html: jobData.html,
                    replyTo: jobData.replyTo
                });
                if (error) throw new Error(error.message);
                this.logger.log(`Email job completed for ${jobData.to}`);
            }
        } catch (err: any) {
            this.logger.error(`Failed to execute email: ${err.message}`);
        }
    }

    /**
     * Sends a push notification to a specific user.
     */
    async sendPush(userId: string, title: string, body: string, data: Record<string, any> = {}) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { expoPushToken: true },
        });

        if (!user?.expoPushToken) {
            this.logger.debug(`User ${userId} has no push token, skipping.`);
            return;
        }

        this.sendToTokens([user.expoPushToken], title, body, data);
    }

    /**
     * Sends a push notification to multiple users.
     */
    async sendPushToMany(userIds: string[], title: string, body: string, data: Record<string, any> = {}) {
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds }, expoPushToken: { not: null } },
            select: { expoPushToken: true },
        });

        const tokens = users.map(u => u.expoPushToken!).filter(t => !!t);
        if (tokens.length === 0) return;

        this.sendToTokens(tokens, title, body, data);
    }

    /**
     * Internal helper to call Expo Push API asynchronously.
     */
    private async sendToTokens(tokens: string[], title: string, body: string, data: Record<string, any> = {}) {
        // Split tokens into Expo tokens and raw FCM tokens. Expo tokens typically
        // start with 'ExponentPushToken' (or 'ExpoPushToken'), while other tokens
        // are likely FCM registration tokens from standalone/bare builds.
        const expoTokens = tokens.filter(t => typeof t === 'string' && (t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken')));
        const fcmTokens = tokens.filter(t => typeof t === 'string' && !expoTokens.includes(t));

        // Send Expo tokens via Expo Push API
        if (expoTokens.length > 0) {
            const messages = expoTokens.map(token => ({
                to: token,
                sound: 'default',
                title,
                body,
                data,
            }));

            try {
                await axios.post('https://exp.host/--/api/v2/push/send', messages, {
                    headers: {
                        'Accept': 'application/json',
                        'Accept-encoding': 'gzip, deflate',
                        'Content-Type': 'application/json',
                    },
                });
                this.logger.log(`Expo push notification job completed for ${expoTokens.length} tokens.`);
            } catch (error: any) {
                this.logger.error(`Failed to send push notifications via Expo: ${error.response?.data?.message || error.message}`);
            }
        }

        // For non-Expo tokens, attempt to send using FCM (server key required)
        if (fcmTokens.length > 0) {
            const fcmKey = process.env.FCM_SERVER_KEY;
            if (!fcmKey) {
                this.logger.warn('FCM_SERVER_KEY not set; skipping FCM push for non-Expo tokens.');
                return;
            }

            const payload = {
                registration_ids: fcmTokens,
                notification: {
                    title,
                    body,
                },
                data,
            };

            try {
                await axios.post('https://fcm.googleapis.com/fcm/send', payload, {
                    headers: {
                        'Authorization': `key=${fcmKey}`,
                        'Content-Type': 'application/json',
                    },
                });
                this.logger.log(`FCM notification job completed for ${fcmTokens.length} tokens.`);
            } catch (error: any) {
                this.logger.error(`Failed to send push notifications via FCM: ${error.response?.data || error.message}`);
            }
        }
    }

    // ─── EMAIL INTEGRATION (RESEND) ──────────────────────────────────────────

    /**
     * Standardized HTML Wrapper for Setorial emails.
     */
    private generateSetorialHtml(title: string, messageHtml: string, previewText: string = '') {
      const logoUrl = (process.env.AWS_URL || '').replace(/\/$/, '') + '/public/logo.png';

      // Ensure content has sensible inline styles for email clients that strip head CSS.
      let contentHtml = messageHtml || '';
      const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(contentHtml.trim());
      if (!looksLikeHtml) {
        // plain text -> wrap in paragraph
        contentHtml = `<p>${contentHtml.replace(/\n/g, '<br/>')}</p>`;
      }

      // Add inline styles to common tags for email client compatibility
      contentHtml = contentHtml
        .replace(/<p(\s*>|[^>]*>)/gi, (m) => m.replace(/<p/i, '<p style="margin:0 0 16px;line-height:1.7;color:#252525;font-size:15px;">'))
        .replace(/<h1(\s*>|[^>]*>)/gi, (m) => m.replace(/<h1/i, '<h1 style="font-size:22px;margin:0 0 12px;color:#171717;">'))
        .replace(/<h2(\s*>|[^>]*>)/gi, (m) => m.replace(/<h2/i, '<h2 style="font-size:18px;margin:0 0 10px;color:#171717;">'))
        .replace(/<ul(\s*>|[^>]*>)/gi, (m) => m.replace(/<ul/i, '<ul style="margin:0 0 16px 20px;padding:0;">'))
        .replace(/<ol(\s*>|[^>]*>)/gi, (m) => m.replace(/<ol/i, '<ol style="margin:0 0 16px 20px;padding:0;">'))
        .replace(/<li(\s*>|[^>]*>)/gi, (m) => m.replace(/<li/i, '<li style="margin-bottom:8px;">'))
        .replace(/<a(\s*>|[^>]*>)/gi, (m) => m.replace(/<a/i, '<a style="color:#ff7600;text-decoration:underline;">'));
      return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>

  <style>
    html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; background: #f7f7f7; }
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    table { border-collapse: collapse !important; }
    img { border: 0; outline: none; text-decoration: none; display: block; max-width: 100%; }
    a { text-decoration: none; }
    .page { width: 100%; background: #f7f7f7; }
    .email { width: 100%; max-width: 600px; background: #ffffff; }
    .orange { background: #ff7600; }
    .yellow { background: #ffd329; }
    .content { font-family: Arial, Helvetica, sans-serif; color: #252525; font-size: 14px; line-height: 1.65; }
    .content h1 { font-family: Arial, Helvetica, sans-serif; color: #171717; font-size: 28px; line-height: 1.2; margin: 0 0 18px; font-weight: 700; }
    .content h2 { font-family: Arial, Helvetica, sans-serif; color: #171717; font-size: 21px; line-height: 1.3; margin: 28px 0 12px; font-weight: 700; }
    .content p { margin: 0 0 16px; }
    .content ul, .content ol { margin: 0 0 18px; padding-left: 22px; }
    .content li { margin-bottom: 7px; }
    .button { display: inline-block; padding: 13px 22px; border-radius: 8px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1; font-weight: 700; }
    .button-orange { background: #ff7600; color: #ffffff !important; }
    .button-yellow { background: #ffd329; color: #222222 !important; }
    .button-white { background: #ffffff; color: #222222 !important; }
    .divider { height: 1px; background: #eeeeee; line-height: 1px; font-size: 1px; }
    .small { font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.5; color: #999999; }
    @media screen and (max-width: 620px) {
      .email { width: 100% !important; }
      .mobile-padding { padding-left: 22px !important; padding-right: 22px !important; }
      .content h1 { font-size: 25px !important; }
      .mobile-full { width: 100% !important; }
    }
  </style>
</head>

<body>
  <!-- Hidden preview text -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${previewText}
  </div>

  <center class="page">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">

          <table role="presentation" class="email" cellpadding="0" cellspacing="0" border="0">

            <!-- HEADER -->
            <tr>
              <td class="orange mobile-padding" style="padding:20px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left" valign="middle">
                      <a href="https://scholarsedgetutorial.com/home" style="display:flex;align-items:center;gap:10px;">
                        <img src="${logoUrl}" alt="Setorial" width="36" height="36" style="border-radius:6px;display:inline-block;vertical-align:middle;" />
                        <span style="font-family:Arial,Helvetica,sans-serif;font-size:21px;font-weight:700;color:#ffffff;">Setorial</span>
                      </a>
                    </td>

                    <td align="right" valign="middle">
                      <a href="https://scholarsedgetutorial.com/home"
                         style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#ffffff;">
                        Visit Website →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- YELLOW BRAND STRIP -->
            <tr>
              <td class="yellow" style="height:5px;font-size:0;line-height:0;">
                &nbsp;
              </td>
            </tr>

            <!-- EMAIL CONTENT -->
            <tr>
              <td class="mobile-padding" style="padding:42px 42px 34px;">
                <div class="content" style="font-family: Arial, Helvetica, sans-serif; color: #252525; font-size:15px; line-height:1.7;">
                  ${contentHtml}
                </div>
              </td>
            </tr>

            <!-- DIVIDER -->
            <tr>
              <td style="padding:0 42px;">
                <div class="divider"></div>
              </td>
            </tr>

            <!-- SIGN-OFF -->
            <tr>
              <td class="mobile-padding" style="padding:24px 42px 38px;">
                <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#777;margin:0;">
                  Need help? Just reply to this email or visit
                  <a href="https://scholarsedgetutorial.com/home"
                     style="color:#ff7600;font-weight:700;">
                    Setorial
                  </a>.
                </p>
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td class="yellow" style="padding:26px 30px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#604f00;margin:0 0 7px;">
                        Setorial
                      </p>
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.6;color:#776500;margin:0;">
                        Illuminate your path to learning.
                      </p>
                      <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.6;color:#776500;margin:12px 0 0;">
                        <a href="https://scholarsedgetutorial.com/home"
                           style="color:#604f00;text-decoration:underline;">
                          Website
                        </a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
    }

    async sendOtpEmail(email: string, otpCode: string, name: string = 'Student') {
        const title = 'Your Setorial verification code';
        const formattedCode = otpCode.length === 6 ? `${otpCode.slice(0, 3)} ${otpCode.slice(3)}` : otpCode;
      const content = `
        <p style="font-size:12px;color:#ff7600;font-weight:700;margin:0 0 10px;">HELLO ${name.toUpperCase()}</p>
        <h1 style="font-size:22px;margin:0 0 12px;color:#171717;">Your Verification Code</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333;">Please use the verification code below to sign in or verify your action.</p>
        <div style="background-color: #ebfef0; border-radius: 6px; padding: 16px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 600; color: #065f46; letter-spacing: 4px;">${formattedCode}</span>
        </div>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333;">This code will expire in 15 minutes and can only be used once. Never share this code with anyone.</p>
      `;

      const html = await this.renderTemplate('setorial_friendly_template.html', {
        content_html: content,
        name,
        action_url: process.env.SITE_URL || 'https://scholarsedgetutorial.com',
        aws_url: process.env.AWS_URL || '',
        site_url: process.env.SITE_URL || 'https://scholarsedgetutorial.com',
        preheader: 'Your Setorial verification code',
        year: new Date().getFullYear(),
        unsubscribe_url: process.env.UNSUBSCRIBE_URL || '#',
        subject: title
      });

      this.executeEmailAsync({ to: email, subject: title, html });
    }

    async sendPasswordResetEmail(email: string, otpCode: string, name: string = 'Student') {
        const title = 'Reset Your Password';
        const formattedCode = otpCode.length === 6 ? `${otpCode.slice(0, 3)} ${otpCode.slice(3)}` : otpCode;
      const content = `
        <p style="font-size:12px;color:#ff7600;font-weight:700;margin:0 0 10px;">HELLO ${name.toUpperCase()}</p>
        <h1 style="font-size:22px;margin:0 0 12px;color:#171717;">Reset Your Password</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333;">Your Setorial password reset code is:</p>
        <div style="background-color: #ebfef0; border-radius: 6px; padding: 16px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 600; color: #065f46; letter-spacing: 4px;">${formattedCode}</span>
        </div>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333;">If you didn't request this, you can safely ignore this email. This code will expire in 15 minutes and can only be used once.</p>
      `;

      const html = await this.renderTemplate('setorial_friendly_template.html', {
        content_html: content,
        name,
        action_url: process.env.SITE_URL || 'https://scholarsedgetutorial.com',
        aws_url: process.env.AWS_URL || '',
        site_url: process.env.SITE_URL || 'https://scholarsedgetutorial.com',
        preheader: 'Reset your Setorial password',
        year: new Date().getFullYear(),
        unsubscribe_url: process.env.UNSUBSCRIBE_URL || '#',
        subject: title
      });

      this.executeEmailAsync({ to: email, subject: title, html });
    }

    async sendWelcomeEmail(email: string, name: string) {
        const title = 'Welcome to Setorial! 🎉';
      const content = `
        <p style="font-size:12px;color:#ff7600;font-weight:700;margin:0 0 10px;">HELLO ${name.toUpperCase()}</p>
        <h1 style="font-size:22px;margin:0 0 12px;color:#171717;">Welcome to Setorial 👋</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333;">We are thrilled to have you onboard! Setorial is designed to make your learning journey profitable and engaging.</p>
        <h2 style="font-size:18px;margin:0 0 10px;color:#171717;">What's next?</h2>
        <ul style="margin:0 0 18px 20px;padding:0;color:#333;font-size:15px;line-height:1.7;">
          <li style="margin-bottom:8px;">Navigate to your <strong>Learning Path</strong> to start earning Points.</li>
          <li style="margin-bottom:8px;">Subscribe to <strong>Silver or Gold</strong> to unlock Monetization.</li>
          <li style="margin-bottom:8px;">Verify your <strong>KYC</strong> to accept payouts globally.</li>
        </ul>
        <p style="margin-bottom:0;">Happy studying,<br/><strong>The Setorial Team</strong></p>
      `;

      const html = await this.renderTemplate('setorial_friendly_template.html', {
        content_html: content,
        name,
        action_url: process.env.SITE_URL || 'https://scholarsedgetutorial.com',
        aws_url: process.env.AWS_URL || '',
        site_url: process.env.SITE_URL || 'https://scholarsedgetutorial.com',
        preheader: 'Welcome to Setorial — get started',
        year: new Date().getFullYear(),
        unsubscribe_url: process.env.UNSUBSCRIBE_URL || '#',
        subject: title
      });

      this.executeEmailAsync({ to: email, subject: title, html });
    }

    async sendPayoutConfirmation(email: string, amount: number, month: string) {
        const title = 'Your Payout is on the way! 💸';
      const content = `
        <p style="font-size:12px;color:#ff7600;font-weight:700;margin:0 0 10px;">HELLO LEARNER</p>
        <h1 style="font-size:22px;margin:0 0 12px;color:#171717;">Your Payout is on the way! 💸</h1>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#333;">Awesome news! Your learning rewards for <strong>${month}</strong> have been processed.</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333;">We've initiated a transfer of <strong>₦${amount.toLocaleString()}</strong> to your configured bank account. Keep studying to increase your rank next month!</p>
      `;

      const html = await this.renderTemplate('setorial_friendly_template.html', {
        content_html: content,
        name: '',
        action_url: process.env.SITE_URL || 'https://scholarsedgetutorial.com',
        aws_url: process.env.AWS_URL || '',
        site_url: process.env.SITE_URL || 'https://scholarsedgetutorial.com',
        preheader: 'Your Setorial payout is being processed',
        year: new Date().getFullYear(),
        unsubscribe_url: process.env.UNSUBSCRIBE_URL || '#',
        subject: title
      });

      this.executeEmailAsync({ to: email, subject: 'Setorial Reward Payout Processing', html });
    }

    async sendBroadcastEmail(emails: string[], subject: string, htmlMessage: string) {
        const title = subject;
      const content_html = htmlMessage;
      const html = await this.renderTemplate('setorial_friendly_template.html', {
        content_html,
        name: '',
        action_url: process.env.SITE_URL || 'https://scholarsedgetutorial.com',
        aws_url: process.env.AWS_URL || '',
        site_url: process.env.SITE_URL || 'https://scholarsedgetutorial.com',
        preheader: subject,
        year: new Date().getFullYear(),
        unsubscribe_url: process.env.UNSUBSCRIBE_URL || '#',
        subject: title
      });

        const chunks = [];
        for (let i = 0; i < emails.length; i += 50) {
            chunks.push(emails.slice(i, i + 50));
        }

      for (const chunk of chunks) {
        const batchPayload = chunk.map(email => ({
          from: this.globalFrom,
          to: email,
          subject,
          html
        }));
        this.executeEmailAsync({ batch: batchPayload });
      }
    }

    async sendSupportEmail(userEmail: string, message: string) {
        const title = 'New Support Request from App';
      const content = `
        <p style="font-size:12px;color:#ff7600;font-weight:700;margin:0 0 10px;">SUPPORT REQUEST</p>
        <h1 style="font-size:22px;margin:0 0 12px;color:#171717;">New Support Request from App</h1>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#333;"><strong>From:</strong> ${userEmail}</p>
        <div style="margin:12px 0;padding:12px;background:#f7f7f7;border-radius:6px;color:#333;">${message.replace(/\n/g, '<br/>')}</div>
      `;

      const html = await this.renderTemplate('setorial_friendly_template.html', {
        content_html: content,
        name: 'Support',
        action_url: process.env.SITE_URL || 'https://scholarsedgetutorial.com',
        aws_url: process.env.AWS_URL || '',
        site_url: process.env.SITE_URL || 'https://scholarsedgetutorial.com',
        preheader: 'New support request received',
        year: new Date().getFullYear(),
        unsubscribe_url: process.env.UNSUBSCRIBE_URL || '#',
        subject: title
      });

      const target = this.supportRedirect;
      this.logger.log(`Routing support email to ${target} (original sender: ${userEmail})`);
      this.executeEmailAsync({ to: target, replyTo: userEmail, subject: `Support Request [${userEmail}]`, html });
    }
}
