import { nanoid } from "nanoid";
import { google } from "googleapis";
import type { Request } from "express";
import type { OAuthFlow, UserAccount } from "../types.js";
import {
  getAuthFlowById,
  getAuthFlowByState,
  getSession,
  getUserByEmail,
  getUserById,
  purgeExpiredSessions,
  upsertAuthFlow,
  upsertSession,
  upsertUser
} from "../store.js";

const OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify"
];

function getOAuthConfig(): { clientId: string; clientSecret: string; redirectUri: string } {
  const clientId = process.env.GMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GMAIL_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("OAuth is not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI.");
  }

  return { clientId, clientSecret, redirectUri };
}

function createOAuthClient() {
  const config = getOAuthConfig();
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

function sessionExpiryDate(now = new Date()): Date {
  const expires = new Date(now);
  expires.setDate(expires.getDate() + 30);
  return expires;
}

export function createGoogleAuthFlow(): { flowId: string; authUrl: string } {
  const oauth = createOAuthClient();
  const flowId = nanoid(16);
  const state = nanoid(24);

  const flow: OAuthFlow = {
    id: flowId,
    state,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  upsertAuthFlow(flow);

  const authUrl = oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: OAUTH_SCOPES,
    state,
    include_granted_scopes: true
  });

  return { flowId, authUrl };
}

export async function completeGoogleAuthFlow(code: string, state: string): Promise<{ flowId: string }> {
  const flow = getAuthFlowByState(state);
  if (!flow || flow.status !== "pending") {
    throw new Error("Invalid or expired OAuth state.");
  }

  const oauth = createOAuthClient();
  const tokenResponse = await oauth.getToken(code);
  const tokens = tokenResponse.tokens;

  oauth.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: oauth });
  const me = await oauth2.userinfo.get();

  const email = me.data.email?.trim().toLowerCase();
  if (!email) {
    throw new Error("Could not resolve Google account email.");
  }

  const existing = getUserByEmail(email);
  const refreshToken = tokens.refresh_token || existing?.refreshToken;
  if (!refreshToken) {
    throw new Error("No refresh token received. Re-consent is required.");
  }

  const user: UserAccount = {
    id: existing?.id || nanoid(14),
    email,
    displayName: me.data.name || existing?.displayName,
    refreshToken,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  upsertUser(user);

  const sessionToken = nanoid(40);
  upsertSession({
    token: sessionToken,
    userId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt: sessionExpiryDate().toISOString()
  });

  upsertAuthFlow({
    ...flow,
    status: "completed",
    completedAt: new Date().toISOString(),
    userId: user.id,
    sessionToken
  });

  return { flowId: flow.id };
}

export function getGoogleAuthFlowStatus(flowId: string):
  | { status: "pending" }
  | { status: "failed"; error?: string }
  | { status: "completed"; sessionToken: string; email: string; displayName?: string } {
  const flow = getAuthFlowById(flowId);
  if (!flow) {
    return { status: "failed", error: "Flow not found" };
  }

  if (flow.status === "pending") {
    return { status: "pending" };
  }

  if (flow.status === "failed") {
    return { status: "failed", error: flow.error };
  }

  if (!flow.sessionToken || !flow.userId) {
    return { status: "failed", error: "Completed flow missing session data" };
  }

  const user = getUserById(flow.userId);
  if (!user) {
    return { status: "failed", error: "User not found" };
  }

  return {
    status: "completed",
    sessionToken: flow.sessionToken,
    email: user.email,
    displayName: user.displayName
  };
}

export function extractSessionToken(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  const customHeader = req.headers["x-mailstorm-session"];
  if (typeof customHeader === "string" && customHeader.trim()) {
    return customHeader.trim();
  }

  return undefined;
}

export function getSessionUserFromRequest(req: Request): UserAccount {
  purgeExpiredSessions();
  const token = extractSessionToken(req);
  if (!token) {
    throw new Error("Missing session token");
  }

  const session = getSession(token);
  if (!session) {
    throw new Error("Invalid session token");
  }

  const user = getUserById(session.userId);
  if (!user) {
    throw new Error("Session user not found");
  }

  return user;
}
