export interface SendEmailInput {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlBody: string;
  threadId?: string;
}

export interface SendEmailResult {
  messageId: string;
  threadId?: string;
}

export interface ThreadMessage {
  id: string;
  threadId?: string;
  from: string;
  to: string;
  subject: string;
  sentAt?: string;
  snippet?: string;
  htmlBody?: string;
}

export interface EmailProvider {
  senderEmail: string;
  canSend: boolean;
  providerName: string;
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
  hasRecipientReplied(threadId: string, recipientEmail: string): Promise<boolean>;
  getThreadMessages(threadId: string): Promise<ThreadMessage[]>;
}
