export type MergeStatus = "running" | "paused" | "completed" | "failed";

export interface FollowUpTemplate {
  id: string;
  step: number;
  delayHours: number;
  delayMinutes?: number;
  scheduledAt?: string;
  ccTemplate?: string;
  bccTemplate?: string;
  subjectTemplate: string;
  bodyTemplate: string;
}

export interface RecipientRow {
  email: string;
  variables: Record<string, string>;
}

export interface RecipientState {
  id: string;
  email: string;
  variables: Record<string, string>;
  initialSentAt?: string;
  threadId?: string;
  messageId?: string;
  repliedAt?: string;
  failedReason?: string;
  followUpStatus: Array<{
    followUpId: string;
    sentAt?: string;
    skippedReason?: string;
    failedReason?: string;
  }>;
}

export interface MailMerge {
  id: string;
  userId: string;
  createdAt: string;
  name: string;
  senderEmail: string;
  subjectTemplate: string;
  bodyTemplate: string;
  ccTemplate?: string;
  bccTemplate?: string;
  status: MergeStatus;
  recipients: RecipientState[];
  followUps: FollowUpTemplate[];
}

export interface StartMergePayload {
  name?: string;
  senderEmail?: string;
  subjectTemplate: string;
  bodyTemplate: string;
  ccTemplate?: string;
  bccTemplate?: string;
  emailColumn: string;
  rows: Array<Record<string, string>>;
  followUps: Array<{
    delayHours: number;
    delayMinutes?: number;
    scheduledAt?: string;
    ccTemplate?: string;
    bccTemplate?: string;
    subjectTemplate: string;
    bodyTemplate: string;
  }>;
}

export interface AppStore {
  merges: MailMerge[];
  users: UserAccount[];
  sessions: UserSession[];
  authFlows: OAuthFlow[];
}

export interface UserAccount {
  id: string;
  email: string;
  displayName?: string;
  refreshToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export type OAuthFlowStatus = "pending" | "completed" | "failed";

export interface OAuthFlow {
  id: string;
  state: string;
  status: OAuthFlowStatus;
  createdAt: string;
  completedAt?: string;
  userId?: string;
  sessionToken?: string;
  error?: string;
}
