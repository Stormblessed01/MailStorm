import type { MergeSummary, StartMergeRequest } from "./types";

declare const __MAILSTORM_API_BASE__: string;

const API_BASE =
  typeof __MAILSTORM_API_BASE__ === "string" && __MAILSTORM_API_BASE__.length > 0
    ? __MAILSTORM_API_BASE__
    : "http://localhost:8787/api";

const SESSION_KEY = "mailstorm_session_token";

function getSessionToken(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionToken(token: string): void {
  localStorage.setItem(SESSION_KEY, token);
}

function withSessionHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const token = getSessionToken();
  if (!token) {
    return headers;
  }
  return {
    ...headers,
    "x-mailstorm-session": token
  };
}

async function fetchApi(path: string, init?: RequestInit): Promise<Response> {
  const headers = withSessionHeaders((init?.headers as Record<string, string>) || {});
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers
  });
}

export async function startGoogleAuth(): Promise<{ flowId: string; authUrl: string }> {
  const response = await fetchApi("/auth/google/start", {
    method: "POST"
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Failed to start OAuth" }));
    throw new Error(body.error || "Failed to start OAuth");
  }

  return (await response.json()) as { flowId: string; authUrl: string };
}

export async function getGoogleAuthFlowStatus(flowId: string): Promise<
  | { status: "pending" }
  | { status: "failed"; error?: string }
  | { status: "completed"; sessionToken: string; email: string; displayName?: string }
> {
  const response = await fetchApi(`/auth/google/status/${flowId}`);
  if (!response.ok) {
    return { status: "failed", error: "Failed to fetch OAuth flow status" };
  }

  return (await response.json()) as
    | { status: "pending" }
    | { status: "failed"; error?: string }
    | { status: "completed"; sessionToken: string; email: string; displayName?: string };
}

export async function getCurrentUser(): Promise<{ id: string; email: string; displayName?: string } | null> {
  const response = await fetchApi("/auth/me");
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  return data.user ?? null;
}

export async function startMerge(payload: StartMergeRequest): Promise<{ id: string; status: string }> {
  const response = await fetchApi("/merges/start", {
    method: "POST",
    headers: withSessionHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Unknown backend error" }));
    throw new Error(body.error || "Failed to start merge");
  }

  const data = await response.json();
  return { id: data.merge.id, status: data.merge.status };
}

export async function listMerges(): Promise<MergeSummary[]> {
  const response = await fetchApi("/merges");
  if (response.status === 401) {
    throw new Error("Unauthorized. Connect your Gmail account again.");
  }
  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.merges as MergeSummary[];
}

export async function getMergeById(mergeId: string): Promise<MergeSummary> {
  const response = await fetchApi(`/merges/${mergeId}`);
  if (response.status === 401) {
    throw new Error("Unauthorized. Connect your Gmail account again.");
  }
  if (!response.ok) {
    throw new Error("Failed to load merge details");
  }

  const data = await response.json();
  return data.merge as MergeSummary;
}

export async function getRecipientThread(
  mergeId: string,
  recipientId: string
): Promise<{
  threadId: string;
  messages: Array<{
    id: string;
    from: string;
    to: string;
    subject: string;
    sentAt?: string;
    snippet?: string;
    htmlBody?: string;
  }>;
}> {
  const response = await fetchApi(`/merges/${mergeId}/recipients/${recipientId}/thread`);
  if (response.status === 401) {
    throw new Error("Unauthorized. Connect your Gmail account again.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Failed to load thread" }));
    throw new Error(body.error || "Failed to load thread");
  }

  return (await response.json()) as {
    threadId: string;
    messages: Array<{
      id: string;
      from: string;
      to: string;
      subject: string;
      sentAt?: string;
      snippet?: string;
      htmlBody?: string;
    }>;
  };
}

export async function checkBackendHealth(): Promise<{ ok: boolean; providerName?: string }> {
  const response = await fetchApi("/health");
  if (!response.ok) {
    return { ok: false };
  }

  const data = await response.json();
  return { ok: true, providerName: data.provider?.providerName };
}
