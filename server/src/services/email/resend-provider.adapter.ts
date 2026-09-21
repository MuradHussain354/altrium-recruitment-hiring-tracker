import { IEmailProvider, SendEmailOptions, SendEmailResult } from './email-provider.interface';

export class ResendProviderAdapter implements IEmailProvider {
  private apiKey: string;
  private fromAddress: string;

  constructor(apiKey?: string, fromAddress?: string) {
    this.apiKey = apiKey || process.env.RESEND_API_KEY || '';
    this.fromAddress = fromAddress || process.env.EMAIL_FROM || 'Altrium Careers <onboarding@resend.dev>';
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: {
          message: 'RESEND_API_KEY is not configured.',
          isPermanent: false,
        },
      };
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      };

      if (options.idempotencyKey) {
        headers['Idempotency-Key'] = options.idempotencyKey;
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from: this.fromAddress,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as any;

      if (!res.ok) {
        const isPermanent = res.status >= 400 && res.status < 500 && res.status !== 429;
        return {
          success: false,
          error: {
            message: body.message || `Resend API returned HTTP ${res.status}`,
            statusCode: res.status,
            isPermanent,
          },
        };
      }

      return {
        success: true,
        messageId: body.id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          message: err.message || 'Network error communicating with email provider.',
          isPermanent: false,
        },
      };
    }
  }
}
