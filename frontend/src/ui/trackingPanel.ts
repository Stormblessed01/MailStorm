import {
  checkBackendHealth,
  getCurrentUser,
  getGoogleAuthFlowStatus,
  getMergeById,
  getRecipientThread,
  listMerges,
  setSessionToken,
  startGoogleAuth
} from "../api";
import type { MergeSummary, ThreadMessage } from "../types";
import { ensureStyles } from "./styles";

function formatDateTime(value?: string): string {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function recipientStatus(recipient: MergeSummary["recipients"][number]): string {
  if (recipient.repliedAt) {
    return "Replied";
  }
  if (recipient.failedReason) {
    return "Failed";
  }
  return "No response";
}

function followUpVisual(recipient: MergeSummary["recipients"][number]): string {
  const lead = recipient.initialSentAt ? "●" : "○";
  const slots = recipient.followUpStatus ?? [];
  const trail = slots
    .map((slot) => {
      if (slot.sentAt) {
        return "●";
      }
      if (slot.failedReason) {
        return "!";
      }
      if (slot.skippedReason) {
        return "↷";
      }
      return "○";
    })
    .join(" ");

  return `${lead}${trail ? ` ${trail}` : ""}`;
}

function summarizeMerge(merge: MergeSummary): {
  sent: number;
  replied: number;
  failed: number;
  followupsSent: number;
  followupsTotal: number;
  lastSent?: string;
} {
  const sent = merge.recipients.filter((recipient) => Boolean(recipient.initialSentAt)).length;
  const replied = merge.recipients.filter((recipient) => Boolean(recipient.repliedAt)).length;
  const failed = merge.recipients.filter((recipient) => Boolean(recipient.failedReason)).length;
  const followupsTotal = merge.recipients.reduce((sum, recipient) => sum + (recipient.followUpStatus?.length ?? 0), 0);
  const followupsSent = merge.recipients.reduce(
    (sum, recipient) => sum + (recipient.followUpStatus?.filter((slot) => Boolean(slot.sentAt)).length ?? 0),
    0
  );

  const allDates = merge.recipients
    .flatMap((recipient) => [recipient.initialSentAt, ...(recipient.followUpStatus?.map((slot) => slot.sentAt) ?? [])])
    .filter((item): item is string => Boolean(item))
    .map((item) => new Date(item).getTime())
    .filter((value) => Number.isFinite(value));

  const lastSent = allDates.length > 0 ? new Date(Math.max(...allDates)).toISOString() : undefined;
  return { sent, replied, failed, followupsSent, followupsTotal, lastSent };
}

export async function openTrackingPanel(): Promise<void> {
  ensureStyles();

  const overlay = document.createElement("div");
  overlay.className = "mailstorm-overlay";
  overlay.innerHTML = `
    <aside class="mailstorm-panel">
      <header class="mailstorm-header">
        <div>
          <div class="mailstorm-title">Mailstorm</div>
          <div class="mailstorm-subtitle">Mail Merge Tracking</div>
        </div>
        <button type="button" class="mailstorm-close" aria-label="Close">✕</button>
      </header>

      <div class="mailstorm-body">
        <div id="mailstorm-tracking-root"></div>
        <div id="mailstorm-msg"></div>
      </div>

      <footer class="mailstorm-footer">
        <button id="mailstorm-connect" class="mailstorm-secondary" type="button">Connect Gmail</button>
        <button id="mailstorm-discard" class="mailstorm-secondary" type="button">Close</button>
      </footer>
    </aside>
  `;

  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector<HTMLButtonElement>(".mailstorm-close")!;
  const connectBtn = overlay.querySelector<HTMLButtonElement>("#mailstorm-connect")!;
  const discardBtn = overlay.querySelector<HTMLButtonElement>("#mailstorm-discard")!;
  const trackingRoot = overlay.querySelector<HTMLElement>("#mailstorm-tracking-root")!;
  const messageHost = overlay.querySelector<HTMLElement>("#mailstorm-msg")!;

  const state: {
    merges: MergeSummary[];
    selectedMerge?: MergeSummary;
  } = {
    merges: []
  };

  const close = (): void => {
    overlay.remove();
  };

  const setMessage = (text: string, kind: "error" | "success" = "error"): void => {
    messageHost.className = kind === "error" ? "mailstorm-error" : "mailstorm-success";
    messageHost.textContent = text;
  };

  const clearMessage = (): void => {
    messageHost.className = "";
    messageHost.textContent = "";
  };

  const ensureConnectedUser = async (): Promise<boolean> => {
    const current = await getCurrentUser();
    if (!current?.email) {
      trackingRoot.innerHTML = `<div class="mailstorm-help">Connect your Gmail account to view your merge tracking data.</div>`;
      return false;
    }

    connectBtn.textContent = `Connected: ${current.email}`;
    return true;
  };

  const runOAuthConnection = async (): Promise<void> => {
    clearMessage();
    try {
      connectBtn.disabled = true;
      connectBtn.textContent = "Opening OAuth...";
      const { flowId, authUrl } = await startGoogleAuth();
      window.open(authUrl, "_blank", "noopener,noreferrer");

      const startedAt = Date.now();
      while (Date.now() - startedAt < 180_000) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const status = await getGoogleAuthFlowStatus(flowId);

        if (status.status === "pending") {
          continue;
        }

        if (status.status === "failed") {
          throw new Error(status.error || "OAuth failed");
        }

        if (status.status === "completed") {
          setSessionToken(status.sessionToken);
          connectBtn.textContent = `Connected: ${status.email}`;
          setMessage(`Connected as ${status.email}`, "success");
          await renderTrackingList();
          return;
        }
      }

      throw new Error("OAuth timed out. Please retry.");
    } catch (error) {
      connectBtn.textContent = "Connect Gmail";
      setMessage((error as Error).message);
    } finally {
      connectBtn.disabled = false;
    }
  };

  const renderTrackingList = async (): Promise<void> => {
    clearMessage();
    const connected = await ensureConnectedUser();
    if (!connected) {
      return;
    }

    state.selectedMerge = undefined;
    try {
      state.merges = await listMerges();
    } catch (error) {
      setMessage((error as Error).message);
      return;
    }

    if (state.merges.length === 0) {
      trackingRoot.innerHTML = `<div class="mailstorm-help">No mail merges found yet.</div>`;
      return;
    }

    const rows = state.merges
      .map((merge) => {
        const summary = summarizeMerge(merge);
        return `
          <button class="mailstorm-track-row" data-action="open-merge" data-merge-id="${merge.id}">
            <span class="mailstorm-track-col name">${escapeHtml(merge.name)}</span>
            <span class="mailstorm-track-col">${escapeHtml(merge.status)}</span>
            <span class="mailstorm-track-col">${summary.sent}</span>
            <span class="mailstorm-track-col">${summary.replied}</span>
            <span class="mailstorm-track-col">${formatDateTime(summary.lastSent)}</span>
          </button>
        `;
      })
      .join("");

    trackingRoot.innerHTML = `
      <div class="mailstorm-track-title">My Mail Merges</div>
      <div class="mailstorm-track-table">
        <div class="mailstorm-track-head">
          <span class="mailstorm-track-col name">Name</span>
          <span class="mailstorm-track-col">Status</span>
          <span class="mailstorm-track-col">Sent</span>
          <span class="mailstorm-track-col">Replied</span>
          <span class="mailstorm-track-col">Last Sent</span>
        </div>
        ${rows}
      </div>
    `;
  };

  const renderMergeDetail = (merge: MergeSummary): void => {
    const summary = summarizeMerge(merge);

    const recipientRows = merge.recipients
      .map((recipient) => {
        return `
          <button class="mailstorm-recipient-row" data-action="open-recipient" data-recipient-id="${recipient.id}">
            <span>${escapeHtml(recipient.email)}</span>
            <span class="mailstorm-followup-visual">${followUpVisual(recipient)}</span>
            <span>${recipientStatus(recipient)}</span>
            <span>${formatDateTime(recipient.initialSentAt)}</span>
          </button>
        `;
      })
      .join("");

    trackingRoot.innerHTML = `
      <div class="mailstorm-track-breadcrumb">
        <button class="mailstorm-secondary" data-action="back-list" type="button">Back</button>
        <strong>${escapeHtml(merge.name)}</strong>
        <span class="mailstorm-badge">${escapeHtml(merge.status)}</span>
      </div>

      <div class="mailstorm-metric-grid">
        <article class="mailstorm-metric-card"><div class="k">Sent</div><div class="v">${summary.sent}</div></article>
        <article class="mailstorm-metric-card"><div class="k">Replied</div><div class="v">${summary.replied}</div></article>
        <article class="mailstorm-metric-card"><div class="k">Failed</div><div class="v">${summary.failed}</div></article>
        <article class="mailstorm-metric-card"><div class="k">Follow-ups</div><div class="v">${summary.followupsSent}/${summary.followupsTotal}</div></article>
      </div>

      <div class="mailstorm-recipient-table">
        <div class="mailstorm-recipient-head">
          <span>Recipient</span>
          <span>Emails</span>
          <span>Status</span>
          <span>First Sent</span>
        </div>
        ${recipientRows}
      </div>
    `;
  };

  const renderThreadView = (
    merge: MergeSummary,
    recipientId: string,
    messages: ThreadMessage[],
    threadId?: string
  ): void => {
    const recipient = merge.recipients.find((item) => item.id === recipientId);
    const rows = messages
      .map((message) => {
        return `
          <article class="mailstorm-thread-item">
            <div class="mailstorm-thread-head">
              <strong>${escapeHtml(message.from || "Unknown Sender")}</strong>
              <span>${formatDateTime(message.sentAt)}</span>
            </div>
            <div class="mailstorm-thread-meta">To: ${escapeHtml(message.to || "-")} | Subject: ${escapeHtml(message.subject || "-")}</div>
            <div class="mailstorm-thread-body">${message.htmlBody || escapeHtml(message.snippet || "")}</div>
          </article>
        `;
      })
      .join("");

    trackingRoot.innerHTML = `
      <div class="mailstorm-track-breadcrumb">
        <button class="mailstorm-secondary" data-action="back-detail" type="button">Back</button>
        <strong>${escapeHtml(recipient?.email || "Recipient")}</strong>
        ${threadId ? `<button class="mailstorm-secondary" data-action="open-gmail-thread" data-thread-id="${threadId}" type="button">Open In Gmail</button>` : ""}
      </div>
      <div class="mailstorm-thread-list">${rows || '<div class="mailstorm-help">No thread messages found.</div>'}</div>
    `;
  };

  trackingRoot.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    const actionNode = target.closest<HTMLElement>("[data-action]");
    if (!actionNode) {
      return;
    }

    const action = actionNode.dataset.action;

    if (action === "back-list") {
      await renderTrackingList();
      return;
    }

    if (action === "open-merge") {
      const mergeId = actionNode.dataset.mergeId;
      if (!mergeId) {
        return;
      }

      try {
        const merge = await getMergeById(mergeId);
        state.selectedMerge = merge;
        renderMergeDetail(merge);
      } catch (error) {
        setMessage((error as Error).message);
      }
      return;
    }

    if (action === "open-recipient") {
      if (!state.selectedMerge) {
        return;
      }

      const recipientId = actionNode.dataset.recipientId;
      if (!recipientId) {
        return;
      }

      try {
        const payload = await getRecipientThread(state.selectedMerge.id, recipientId);
        renderThreadView(state.selectedMerge, recipientId, payload.messages, payload.threadId);
      } catch (error) {
        setMessage((error as Error).message);
      }
      return;
    }

    if (action === "back-detail") {
      if (state.selectedMerge) {
        const fresh = await getMergeById(state.selectedMerge.id);
        state.selectedMerge = fresh;
        renderMergeDetail(fresh);
      }
      return;
    }

    if (action === "open-gmail-thread") {
      const threadId = actionNode.dataset.threadId;
      if (threadId) {
        window.open(`https://mail.google.com/mail/u/0/#all/${threadId}`, "_blank");
      }
    }
  });

  closeBtn.addEventListener("click", close);
  connectBtn.addEventListener("click", () => {
    void runOAuthConnection();
  });
  discardBtn.addEventListener("click", close);

  await renderTrackingList();

  const health = await checkBackendHealth();
  if (!health.ok) {
    setMessage("Backend is unreachable on http://localhost:8787. Start backend first.");
  } else {
    setMessage(`Connected to backend (${health.providerName || "unknown provider"}).`, "success");
  }
}
