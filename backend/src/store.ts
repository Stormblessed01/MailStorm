import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { AppStore, MailMerge, OAuthFlow, UserAccount, UserSession } from "./types.js";

const STORE_PATH = new URL("../data/store.json", import.meta.url);
const STORE_FILE_PATH = fileURLToPath(STORE_PATH);

function ensureStoreFile(): void {
  const path = STORE_FILE_PATH;
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(path)) {
    const seed: AppStore = { merges: [], users: [], sessions: [], authFlows: [] };
    writeFileSync(path, JSON.stringify(seed, null, 2), "utf-8");
  }
}

export function readStore(): AppStore {
  ensureStoreFile();
  const raw = readFileSync(STORE_FILE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as Partial<AppStore>;
  return {
    merges: parsed.merges ?? [],
    users: parsed.users ?? [],
    sessions: parsed.sessions ?? [],
    authFlows: parsed.authFlows ?? []
  };
}

export function writeStore(data: AppStore): void {
  ensureStoreFile();
  writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function upsertMerge(merge: MailMerge): void {
  const store = readStore();
  const index = store.merges.findIndex((item) => item.id === merge.id);
  if (index >= 0) {
    store.merges[index] = merge;
  } else {
    store.merges.unshift(merge);
  }
  writeStore(store);
}

export function listMerges(): MailMerge[] {
  return readStore().merges;
}

export function listMergesForUser(userId: string): MailMerge[] {
  return readStore().merges.filter((merge) => merge.userId === userId);
}

export function getMerge(mergeId: string): MailMerge | undefined {
  return readStore().merges.find((merge) => merge.id === mergeId);
}

export function getMergeForUser(mergeId: string, userId: string): MailMerge | undefined {
  return readStore().merges.find((merge) => merge.id === mergeId && merge.userId === userId);
}

export function upsertUser(user: UserAccount): void {
  const store = readStore();
  const index = store.users.findIndex((item) => item.id === user.id || item.email.toLowerCase() === user.email.toLowerCase());
  if (index >= 0) {
    store.users[index] = user;
  } else {
    store.users.push(user);
  }
  writeStore(store);
}

export function getUserByEmail(email: string): UserAccount | undefined {
  return readStore().users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function getUserById(userId: string): UserAccount | undefined {
  return readStore().users.find((user) => user.id === userId);
}

export function upsertSession(session: UserSession): void {
  const store = readStore();
  const index = store.sessions.findIndex((item) => item.token === session.token);
  if (index >= 0) {
    store.sessions[index] = session;
  } else {
    store.sessions.unshift(session);
  }
  writeStore(store);
}

export function getSession(token: string): UserSession | undefined {
  return readStore().sessions.find((session) => session.token === token);
}

export function purgeExpiredSessions(now = new Date()): void {
  const store = readStore();
  store.sessions = store.sessions.filter((session) => new Date(session.expiresAt) > now);
  writeStore(store);
}

export function upsertAuthFlow(flow: OAuthFlow): void {
  const store = readStore();
  const index = store.authFlows.findIndex((item) => item.id === flow.id);
  if (index >= 0) {
    store.authFlows[index] = flow;
  } else {
    store.authFlows.unshift(flow);
  }
  writeStore(store);
}

export function getAuthFlowById(flowId: string): OAuthFlow | undefined {
  return readStore().authFlows.find((flow) => flow.id === flowId);
}

export function getAuthFlowByState(state: string): OAuthFlow | undefined {
  return readStore().authFlows.find((flow) => flow.state === state);
}
