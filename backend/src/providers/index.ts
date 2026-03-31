import { GmailProvider } from "./gmailProvider.js";
import { MockProvider } from "./mockProvider.js";
import type { EmailProvider } from "./emailProvider.js";
import type { UserAccount } from "../types.js";

export function resolveProvider(user?: UserAccount): EmailProvider {
  if (user?.refreshToken && user?.email) {
    const userClientId = process.env.GMAIL_CLIENT_ID?.trim();
    const userClientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
    const userRedirectUri = process.env.GMAIL_REDIRECT_URI?.trim();

    if (userClientId && userClientSecret && userRedirectUri) {
      return new GmailProvider({
        clientId: userClientId,
        clientSecret: userClientSecret,
        redirectUri: userRedirectUri,
        refreshToken: user.refreshToken,
        senderEmail: user.email
      });
    }
  }

  const clientId = process.env.GMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GMAIL_REDIRECT_URI?.trim();
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();
  const senderEmail = process.env.GMAIL_SENDER_EMAIL?.trim();

  if (clientId && clientSecret && redirectUri && refreshToken && senderEmail) {
    return new GmailProvider({
      clientId,
      clientSecret,
      redirectUri,
      refreshToken,
      senderEmail
    });
  }

  return new MockProvider();
}
