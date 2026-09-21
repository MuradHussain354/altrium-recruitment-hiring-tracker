import { IEmailProvider, SendEmailOptions, SendEmailResult } from './email-provider.interface';

export interface RecordedEmail extends SendEmailOptions {
  messageId: string;
  sentAt: Date;
}

export class MockProviderAdapter implements IEmailProvider {
  private sentEmails: RecordedEmail[] = [];
  private simulatedFailure: { statusCode: number; message: string; isPermanent: boolean } | null = null;

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (this.simulatedFailure) {
      const err = { ...this.simulatedFailure };
      return {
        success: false,
        error: {
          message: err.message,
          statusCode: err.statusCode,
          isPermanent: err.isPermanent,
        },
      };
    }

    const messageId = `mock_msg_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    const recorded: RecordedEmail = {
      ...options,
      messageId,
      sentAt: new Date(),
    };

    this.sentEmails.push(recorded);

    if (process.env.NODE_ENV !== 'test') {
      console.log(`[MockEmailProvider] Sent to: ${options.to} | Subject: "${options.subject}" | ID: ${messageId}`);
    }

    return {
      success: true,
      messageId,
    };
  }

  getSentEmails(): RecordedEmail[] {
    return [...this.sentEmails];
  }

  getLastSentEmail(): RecordedEmail | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  clear(): void {
    this.sentEmails = [];
    this.simulatedFailure = null;
  }

  setSimulatedFailure(failure: { statusCode: number; message: string; isPermanent: boolean } | null): void {
    this.simulatedFailure = failure;
  }
}
