import { nanoid } from "nanoid";
import type { EmailProvider, SendEmailInput, SendEmailResult, ThreadMessage } from "./emailProvider.js";

export class MockProvider implements EmailProvider {
  public readonly senderEmail: string;
  public readonly canSend = false;
  public readonly providerName = "mock";

  constructor(senderEmail = "mock-sender@mailstorm.local") {
    this.senderEmail = senderEmail;
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const messageId = `mock-${nanoid(10)}`;
    const threadId = input.threadId ?? `thread-${nanoid(10)}`;
    return { messageId, threadId };
  }

  async hasRecipientReplied(): Promise<boolean> {
    return false;
  }

  async getThreadMessages(threadId: string): Promise<ThreadMessage[]> {
    return [
      {
        id: `mock-msg-${nanoid(8)}`,
        threadId,
        from: this.senderEmail,
        to: "recipient@example.com",
        subject: "Mock thread",
        sentAt: new Date().toISOString(),
        snippet: "Mock mode enabled. No real Gmail thread content is available.",
        htmlBody: "<p>Mock mode enabled. No real Gmail thread content is available.</p>"
      }
    ];
  }
}
