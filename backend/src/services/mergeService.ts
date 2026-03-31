import { nanoid } from "nanoid";
import { resolveProvider } from "../providers/index.js";
import type { ThreadMessage } from "../providers/emailProvider.js";
import type { FollowUpTemplate, MailMerge, RecipientState, StartMergePayload } from "../types.js";
import { detectEmailColumn, isValidEmail } from "../utils/emailDetection.js";
import { normalizeRow, renderTemplate } from "../utils/template.js";
import { getMergeForUser, getUserById, listMerges, listMergesForUser, upsertMerge } from "../store.js";

function getProvider(userId: string) {
  const user = getUserById(userId);
  return resolveProvider(user);
}

function renderAddressList(template: string | undefined, variables: Record<string, string>): string[] {
  if (!template) {
    return [];
  }

  const rendered = renderTemplate(template, variables);
  return rendered
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toFollowUps(
  rawFollowUps: StartMergePayload["followUps"]
): FollowUpTemplate[] {
  return rawFollowUps.slice(0, 10).map((followUp, index) => ({
    id: nanoid(10),
    step: index + 1,
    delayHours: Math.max(1, Math.floor(followUp.delayHours)),
    delayMinutes:
      typeof followUp.delayMinutes === "number" && Number.isFinite(followUp.delayMinutes)
        ? Math.max(1, Math.floor(followUp.delayMinutes))
        : undefined,
    scheduledAt: followUp.scheduledAt,
    ccTemplate: followUp.ccTemplate,
    bccTemplate: followUp.bccTemplate,
    subjectTemplate: followUp.subjectTemplate,
    bodyTemplate: followUp.bodyTemplate
  }));
}

function resolveFollowUpDueAt(followUp: FollowUpTemplate, initialSentAt: Date): Date {
  if (followUp.scheduledAt) {
    const absolute = new Date(followUp.scheduledAt);
    if (!Number.isNaN(absolute.getTime())) {
      return absolute;
    }
  }

  const delayMinutes =
    typeof followUp.delayMinutes === "number" && Number.isFinite(followUp.delayMinutes)
      ? Math.max(1, Math.floor(followUp.delayMinutes))
      : Math.max(1, Math.floor(followUp.delayHours)) * 60;

  return new Date(initialSentAt.getTime() + delayMinutes * 60 * 1000);
}

function buildRecipients(payload: StartMergePayload, emailColumn: string, followUps: FollowUpTemplate[]): RecipientState[] {
  const recipients: RecipientState[] = [];

  for (const row of payload.rows) {
    const normalized = normalizeRow(row);
    const email = normalized[emailColumn] ?? "";
    if (!isValidEmail(email)) {
      continue;
    }

    const variables = { ...normalized };
    delete variables[emailColumn];

    recipients.push({
      id: nanoid(10),
      email,
      variables,
      followUpStatus: followUps.map((followUp) => ({ followUpId: followUp.id }))
    });
  }

  return recipients;
}

export async function startMerge(payload: StartMergePayload, userId: string): Promise<MailMerge> {
  const provider = getProvider(userId);
  const emailColumn = detectEmailColumn(payload.rows, payload.emailColumn);
  const followUps = toFollowUps(payload.followUps);
  const recipients = buildRecipients(payload, emailColumn, followUps);

  const merge: MailMerge = {
    id: nanoid(12),
    userId,
    createdAt: new Date().toISOString(),
    name: payload.name?.trim() || `Merge ${new Date().toLocaleString()}`,
    senderEmail: payload.senderEmail?.trim() || provider.senderEmail,
    subjectTemplate: payload.subjectTemplate,
    bodyTemplate: payload.bodyTemplate,
    ccTemplate: payload.ccTemplate,
    bccTemplate: payload.bccTemplate,
    status: "running",
    recipients,
    followUps
  };

  for (const recipient of merge.recipients) {
    try {
      const subject = renderTemplate(merge.subjectTemplate, recipient.variables);
      const htmlBody = renderTemplate(merge.bodyTemplate, recipient.variables).replace(/\n/g, "<br>");
      const cc = renderAddressList(merge.ccTemplate, recipient.variables);
      const bcc = renderAddressList(merge.bccTemplate, recipient.variables);
      const result = await provider.sendEmail({
        to: recipient.email,
        cc,
        bcc,
        subject,
        htmlBody
      });

      recipient.initialSentAt = new Date().toISOString();
      recipient.threadId = result.threadId;
      recipient.messageId = result.messageId;
    } catch (error) {
      recipient.failedReason = (error as Error).message;
    }
  }

  upsertMerge(merge);
  return merge;
}

export function getAllMerges(): MailMerge[] {
  return listMerges();
}

export function getMergesByUser(userId: string): MailMerge[] {
  return listMergesForUser(userId);
}

export function getMergeById(mergeId: string, userId: string): MailMerge | undefined {
  return getMergeForUser(mergeId, userId);
}

export async function processDueFollowUps(now = new Date()): Promise<void> {
  const merges = listMerges();

  for (const merge of merges) {
    if (merge.status !== "running") {
      continue;
    }

    let mergeMutated = false;

    for (const recipient of merge.recipients) {
      if (!recipient.threadId || recipient.failedReason || recipient.repliedAt) {
        continue;
      }

      const sentAt = recipient.initialSentAt ? new Date(recipient.initialSentAt) : null;
      if (!sentAt) {
        continue;
      }

      const provider = getProvider(merge.userId);
      const hasReply = await provider.hasRecipientReplied(recipient.threadId, recipient.email);
      if (hasReply) {
        recipient.repliedAt = now.toISOString();
        mergeMutated = true;
        continue;
      }

      for (const followUp of merge.followUps) {
        const slot = recipient.followUpStatus.find((item) => item.followUpId === followUp.id);
        if (!slot || slot.sentAt || slot.skippedReason || slot.failedReason) {
          continue;
        }

        const dueAt = resolveFollowUpDueAt(followUp, sentAt);
        if (dueAt > now) {
          continue;
        }

        try {
          const followUpReplied = await provider.hasRecipientReplied(recipient.threadId, recipient.email);
          if (followUpReplied) {
            recipient.repliedAt = now.toISOString();
            slot.skippedReason = "Recipient already replied";
            mergeMutated = true;
            break;
          }

          const subject = renderTemplate(followUp.subjectTemplate, recipient.variables);
          const htmlBody = renderTemplate(followUp.bodyTemplate, recipient.variables).replace(/\n/g, "<br>");
          const cc = renderAddressList(followUp.ccTemplate, recipient.variables);
          const bcc = renderAddressList(followUp.bccTemplate, recipient.variables);

          await provider.sendEmail({
            to: recipient.email,
            cc,
            bcc,
            subject,
            htmlBody,
            threadId: recipient.threadId
          });

          slot.sentAt = now.toISOString();
          mergeMutated = true;
        } catch (error) {
          slot.failedReason = (error as Error).message;
          mergeMutated = true;
        }
      }
    }

    const hasPendingFollowUps = merge.recipients.some((recipient) => {
      return recipient.followUpStatus.some((slot) => !slot.sentAt && !slot.skippedReason && !slot.failedReason);
    });

    if (!hasPendingFollowUps) {
      merge.status = "completed";
      mergeMutated = true;
    }

    if (mergeMutated) {
      upsertMerge(merge);
    }
  }
}

export function getProviderInfo(): { providerName: string; canSend: boolean; senderEmail: string } {
  const oauthReady = Boolean(
    process.env.GMAIL_CLIENT_ID?.trim() &&
      process.env.GMAIL_CLIENT_SECRET?.trim() &&
      process.env.GMAIL_REDIRECT_URI?.trim()
  );

  const provider = oauthReady ? { providerName: "gmail-api", canSend: true, senderEmail: "user-connected" } : resolveProvider();
  return {
    providerName: provider.providerName,
    canSend: provider.canSend,
    senderEmail: provider.senderEmail
  };
}

export async function getRecipientThread(
  mergeId: string,
  recipientId: string,
  userId: string
): Promise<{ threadId: string; messages: ThreadMessage[] }> {
  const merge = getMergeForUser(mergeId, userId);
  if (!merge) {
    throw new Error("Merge not found");
  }

  const recipient = merge.recipients.find((item) => item.id === recipientId);
  if (!recipient) {
    throw new Error("Recipient not found");
  }

  if (!recipient.threadId) {
    throw new Error("Thread not available for recipient");
  }

  const provider = getProvider(userId);
  const messages = await provider.getThreadMessages(recipient.threadId);
  return {
    threadId: recipient.threadId,
    messages
  };
}
