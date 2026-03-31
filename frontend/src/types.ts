export interface ParsedCsv {
  headers: string[];
  rows: Array<Record<string, string>>;
  emailColumn: string;
}

export interface FollowUpInput {
  delayHours: number;
  delayMinutes?: number;
  scheduledAt?: string;
  ccTemplate?: string;
  bccTemplate?: string;
  subjectTemplate: string;
  bodyTemplate: string;
}

export interface StartMergeRequest {
  name?: string;
  subjectTemplate: string;
  bodyTemplate: string;
  ccTemplate?: string;
  bccTemplate?: string;
  emailColumn: string;
  rows: Array<Record<string, string>>;
  followUps: FollowUpInput[];
}

export interface MergeSummary {
  id: string;
  createdAt: string;
  name: string;
  status: string;
  recipients: Array<{
    id: string;
    email: string;
    initialSentAt?: string;
    threadId?: string;
    messageId?: string;
    repliedAt?: string;
    failedReason?: string;
    followUpStatus?: Array<{
      followUpId: string;
      sentAt?: string;
      skippedReason?: string;
      failedReason?: string;
    }>;
  }>;
}

export interface ThreadMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  sentAt?: string;
  snippet?: string;
  htmlBody?: string;
}
