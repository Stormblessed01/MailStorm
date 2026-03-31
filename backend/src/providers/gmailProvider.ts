import { google, gmail_v1 } from "googleapis";
import type { EmailProvider, SendEmailInput, SendEmailResult, ThreadMessage } from "./emailProvider.js";

function toBase64Url(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildRawMime(from: string, input: SendEmailInput): string {
  const headers = [
    `From: ${from}`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`
  ];

  if (input.cc && input.cc.length > 0) {
    headers.push(`Cc: ${input.cc.join(", ")}`);
  }

  if (input.bcc && input.bcc.length > 0) {
    headers.push(`Bcc: ${input.bcc.join(", ")}`);
  }

  const mime = [
    ...headers,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    input.htmlBody
  ].join("\r\n");

  return toBase64Url(mime);
}

function decodeBase64Url(input?: string): string {
  if (!input) {
    return "";
  }

  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf-8");
}

function findPartBody(part?: gmail_v1.Schema$MessagePart): string {
  if (!part) {
    return "";
  }

  if (part.mimeType === "text/html" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }

  if (part.parts && part.parts.length > 0) {
    for (const child of part.parts) {
      const body = findPartBody(child);
      if (body) {
        return body;
      }
    }
  }

  if (part.mimeType === "text/plain" && part.body?.data) {
    const plain = decodeBase64Url(part.body.data);
    return `<pre>${plain}</pre>`;
  }

  return "";
}

function findHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  const target = name.toLowerCase();
  return headers?.find((header) => header.name?.toLowerCase() === target)?.value ?? "";
}

export class GmailProvider implements EmailProvider {
  public readonly senderEmail: string;
  public readonly canSend = true;
  public readonly providerName = "gmail-api";
  private readonly gmail: gmail_v1.Gmail;

  constructor(config: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    refreshToken: string;
    senderEmail: string;
  }) {
    this.senderEmail = config.senderEmail;

    const auth = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
    auth.setCredentials({ refresh_token: config.refreshToken });
    this.gmail = google.gmail({ version: "v1", auth });
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const raw = buildRawMime(this.senderEmail, input);

    const response = await this.gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw,
        threadId: input.threadId
      }
    });

    if (!response.data.id) {
      throw new Error("Gmail API did not return a message id.");
    }

    return {
      messageId: response.data.id,
      threadId: response.data.threadId ?? input.threadId
    };
  }

  async hasRecipientReplied(threadId: string, recipientEmail: string): Promise<boolean> {
    const thread = await this.gmail.users.threads.get({
      userId: "me",
      id: threadId,
      format: "metadata",
      metadataHeaders: ["From"]
    });

    const messages = thread.data.messages ?? [];
    const normalizedRecipient = recipientEmail.toLowerCase().trim();
    const normalizedSender = this.senderEmail.toLowerCase().trim();

    for (const message of messages) {
      const headers = message.payload?.headers ?? [];
      const from =
        headers.find((header: gmail_v1.Schema$MessagePartHeader) => header.name?.toLowerCase() === "from")
          ?.value ?? "";
      const fromLower = from.toLowerCase();

      if (fromLower.includes(normalizedRecipient) && !fromLower.includes(normalizedSender)) {
        return true;
      }
    }

    return false;
  }

  async getThreadMessages(threadId: string): Promise<ThreadMessage[]> {
    const thread = await this.gmail.users.threads.get({
      userId: "me",
      id: threadId,
      format: "full"
    });

    const messages = thread.data.messages ?? [];
    return messages.map((message: gmail_v1.Schema$Message) => {
      const headers = message.payload?.headers ?? [];
      const headerDate = findHeader(headers, "Date");
      return {
        id: message.id ?? "",
        threadId: message.threadId ?? undefined,
        from: findHeader(headers, "From"),
        to: findHeader(headers, "To"),
        subject: findHeader(headers, "Subject"),
        sentAt: headerDate || message.internalDate || undefined,
        snippet: message.snippet ?? "",
        htmlBody: findPartBody(message.payload)
      };
    });
  }
}
