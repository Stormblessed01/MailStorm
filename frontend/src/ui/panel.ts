import {
  checkBackendHealth,
  getCurrentUser,
  getGoogleAuthFlowStatus,
  setSessionToken,
  startGoogleAuth,
  startMerge
} from "../api";
import type { FollowUpInput, ParsedCsv, StartMergeRequest } from "../types";
import { ensureStyles } from "./styles";

interface PanelInitialState {
  subject: string;
  bodyText: string;
}

interface PanelResult {
  refreshCompose?: boolean;
}

function detectEmailColumn(rows: Array<Record<string, string>>): string {
  if (rows.length === 0) {
    throw new Error("CSV contains no rows");
  }

  const headers = Object.keys(rows[0]);
  const lower = headers.map((h) => h.toLowerCase().trim());
  const preferred = ["email", "email_address", "emailaddress", "mail", "recipient", "to"];

  for (const candidate of preferred) {
    const index = lower.findIndex((item) => item === candidate);
    if (index >= 0) {
      return headers[index];
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let best = headers[0];
  let bestScore = -1;

  for (const header of headers) {
    const score = rows.reduce((count, row) => {
      return count + (emailRegex.test((row[header] || "").trim()) ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      best = header;
      bestScore = score;
    }
  }

  if (bestScore <= 0) {
    throw new Error("Could not identify email column.");
  }

  return best;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvText(text: string): Array<Record<string, string>> {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = (values[index] ?? "").trim();
    });

    rows.push(row);
  }

  return rows;
}

async function parseCsv(file: File): Promise<ParsedCsv> {
  const text = await file.text();
  const rows = parseCsvText(text).map((row) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key.trim()] = (value ?? "").trim();
    }
    return normalized;
  });

  if (rows.length === 0) {
    throw new Error("CSV contains no data rows.");
  }

  const headers = Object.keys(rows[0]);
  const emailColumn = detectEmailColumn(rows);
  return { headers, rows, emailColumn };
}

function buildFollowUpCard(index: number): string {
  return `
    <div class="mailstorm-followup-card" data-followup-index="${index}">
      <div class="mailstorm-followup-title">Follow-up ${index}</div>
      <div class="mailstorm-field">
        <label>Schedule Type</label>
        <select class="mailstorm-select" data-followup="mode">
          <option value="relative">After initial email</option>
          <option value="absolute">On specific date and time</option>
        </select>
      </div>
      <div class="mailstorm-field" data-followup-block="relative">
        <label>Delay (minutes)</label>
        <input class="mailstorm-input" type="number" min="1" step="1" value="60" data-followup="delayMinutes" />
      </div>
      <div class="mailstorm-field mailstorm-hidden" data-followup-block="absolute">
        <label>Date & Time</label>
        <input class="mailstorm-input" type="datetime-local" data-followup="scheduledAt" />
      </div>
      <div class="mailstorm-field">
        <label>Subject</label>
        <input class="mailstorm-input" type="text" placeholder="Follow-up {{name}}" data-followup="subject" />
      </div>
      <div class="mailstorm-field">
        <label>Body</label>
        <textarea class="mailstorm-textarea" data-followup="body" placeholder="Hi {{name}}, just following up..."></textarea>
      </div>
      <div class="mailstorm-field">
        <label>CC (comma separated)</label>
        <input class="mailstorm-input" type="text" data-followup="cc" placeholder="team@example.com, manager@example.com" />
      </div>
      <div class="mailstorm-field">
        <label>BCC (comma separated)</label>
        <input class="mailstorm-input" type="text" data-followup="bcc" placeholder="audit@example.com" />
      </div>
    </div>
  `;
}

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

export async function openMailMergePanel(initial: PanelInitialState): Promise<PanelResult> {
  ensureStyles();

  const overlay = document.createElement("div");
  overlay.className = "mailstorm-overlay";
  overlay.innerHTML = `
    <aside class="mailstorm-panel">
      <header class="mailstorm-header">
        <div>
          <div class="mailstorm-title">Mailstorm</div>
          <div class="mailstorm-subtitle">Gmail Mail Merge Workspace</div>
        </div>
        <button type="button" class="mailstorm-close" aria-label="Close">✕</button>
      </header>
      <nav class="mailstorm-tabs">
        <button class="mailstorm-tab active" data-tab="messages">Compose</button>
        <button class="mailstorm-tab" data-tab="advanced">Follow-ups</button>
      </nav>
      <div class="mailstorm-body">
        <section class="mailstorm-section active" data-section="messages">
          <div class="mailstorm-help">Upload CSV and use variables like {{name}} inside subject/body/cc/bcc.</div>
          <div class="mailstorm-field mailstorm-upload">
            <label>CSV File</label>
            <input id="mailstorm-csv" type="file" accept=".csv" />
            <small id="mailstorm-csv-meta"></small>
          </div>
          <div class="mailstorm-field">
            <label>Subject Template</label>
            <input id="mailstorm-subject" class="mailstorm-input" type="text" />
          </div>
          <div class="mailstorm-field">
            <label>Body Template</label>
            <textarea id="mailstorm-body" class="mailstorm-textarea"></textarea>
          </div>
          <div class="mailstorm-field">
            <label>CC (comma separated)</label>
            <input id="mailstorm-cc" class="mailstorm-input" type="text" placeholder="team@example.com, {{manager_email}}" />
          </div>
          <div class="mailstorm-field">
            <label>BCC (comma separated)</label>
            <input id="mailstorm-bcc" class="mailstorm-input" type="text" placeholder="audit@example.com" />
          </div>
          <div class="mailstorm-field">
            <label>Detected Variables</label>
            <div id="mailstorm-vars" class="mailstorm-chip-list"></div>
          </div>
        </section>

        <section class="mailstorm-section" data-section="advanced">
          <div class="mailstorm-help">Configure up to 10 follow-ups. Follow-ups stop if a recipient replies.</div>
          <div class="mailstorm-field">
            <label>Merge Name</label>
            <input id="mailstorm-name" class="mailstorm-input" type="text" placeholder="Quarterly outreach" />
          </div>
          <div id="mailstorm-followups"></div>
          <button id="mailstorm-add-followup" class="mailstorm-secondary" type="button">Add Follow-up</button>
        </section>

        <div id="mailstorm-msg"></div>
      </div>
      <footer class="mailstorm-footer">
        <button id="mailstorm-connect" class="mailstorm-secondary" type="button">Connect Gmail</button>
        <button id="mailstorm-start" class="mailstorm-primary" type="button">Start mail merge now</button>
        <button id="mailstorm-discard" class="mailstorm-secondary" type="button">Discard</button>
      </footer>
    </aside>
  `;

  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector<HTMLButtonElement>(".mailstorm-close")!;
  const discardBtn = overlay.querySelector<HTMLButtonElement>("#mailstorm-discard")!;
  const connectBtn = overlay.querySelector<HTMLButtonElement>("#mailstorm-connect")!;
  const startBtn = overlay.querySelector<HTMLButtonElement>("#mailstorm-start")!;
  const csvInput = overlay.querySelector<HTMLInputElement>("#mailstorm-csv")!;
  const csvMeta = overlay.querySelector<HTMLElement>("#mailstorm-csv-meta")!;
  const varsHost = overlay.querySelector<HTMLElement>("#mailstorm-vars")!;
  const subjectInput = overlay.querySelector<HTMLInputElement>("#mailstorm-subject")!;
  const bodyInput = overlay.querySelector<HTMLTextAreaElement>("#mailstorm-body")!;
  const ccInput = overlay.querySelector<HTMLInputElement>("#mailstorm-cc")!;
  const bccInput = overlay.querySelector<HTMLInputElement>("#mailstorm-bcc")!;
  const messageHost = overlay.querySelector<HTMLElement>("#mailstorm-msg")!;
  const followupsHost = overlay.querySelector<HTMLElement>("#mailstorm-followups")!;
  const addFollowupBtn = overlay.querySelector<HTMLButtonElement>("#mailstorm-add-followup")!;
  const nameInput = overlay.querySelector<HTMLInputElement>("#mailstorm-name")!;

  subjectInput.value = initial.subject;
  bodyInput.value = initial.bodyText;

  let parsedCsv: ParsedCsv | null = null;
  let followupCount = 0;
  let connectedEmail: string | null = null;

  function close(): void {
    overlay.remove();
  }

  function setMessage(text: string, kind: "error" | "success" = "error"): void {
    messageHost.className = kind === "error" ? "mailstorm-error" : "mailstorm-success";
    messageHost.textContent = text;
  }

  function clearMessage(): void {
    messageHost.className = "";
    messageHost.textContent = "";
  }

  async function ensureConnectedUser(): Promise<boolean> {
    const current = await getCurrentUser();
    if (current?.email) {
      connectedEmail = current.email;
      connectBtn.textContent = `Connected: ${current.email}`;
      return true;
    }

    setMessage("Connect your Gmail account first.");
    return false;
  }

  async function runOAuthConnection(): Promise<void> {
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
          connectedEmail = status.email;
          connectBtn.textContent = `Connected: ${status.email}`;
          setMessage(`Connected as ${status.email}`, "success");
          return;
        }
      }

      throw new Error("OAuth timed out. Please retry.");
    } catch (error) {
      connectBtn.textContent = "Connect Gmail";
      setMessage((error as Error).message);
    } finally {
      connectBtn.disabled = false;
      if (!connectedEmail) {
        connectBtn.textContent = "Connect Gmail";
      }
    }
  }

  function renderVariables(headers: string[], emailColumn: string): void {
    varsHost.innerHTML = "";
    headers
      .filter((header) => header !== emailColumn)
      .forEach((header) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "mailstorm-chip";
        chip.textContent = `{{${header}}}`;
        chip.addEventListener("click", () => {
          bodyInput.value += bodyInput.value.endsWith(" ") || bodyInput.value.length === 0 ? `{{${header}}}` : ` {{${header}}}`;
        });
        varsHost.appendChild(chip);
      });
  }

  function readFollowUps(): FollowUpInput[] {
    const cards = Array.from(followupsHost.querySelectorAll<HTMLElement>(".mailstorm-followup-card"));

    return cards.map((card) => {
      const mode = card.querySelector<HTMLSelectElement>("[data-followup='mode']")!;
      const delayMinutesInput = card.querySelector<HTMLInputElement>("[data-followup='delayMinutes']")!;
      const scheduledAtInput = card.querySelector<HTMLInputElement>("[data-followup='scheduledAt']")!;
      const subject = card.querySelector<HTMLInputElement>("[data-followup='subject']")!;
      const body = card.querySelector<HTMLTextAreaElement>("[data-followup='body']")!;
      const cc = card.querySelector<HTMLInputElement>("[data-followup='cc']")!;
      const bcc = card.querySelector<HTMLInputElement>("[data-followup='bcc']")!;

      const delayMinutes = Math.max(1, Number(delayMinutesInput.value) || 60);
      const scheduledAt = scheduledAtInput.value ? new Date(scheduledAtInput.value).toISOString() : undefined;

      const relativeFollowUp: FollowUpInput = {
        delayHours: Math.max(1, Math.ceil(delayMinutes / 60)),
        delayMinutes,
        ccTemplate: cc.value.trim() || undefined,
        bccTemplate: bcc.value.trim() || undefined,
        subjectTemplate: subject.value.trim() || "Quick follow-up",
        bodyTemplate: body.value.trim() || "Just checking in on my previous email."
      };

      if (mode.value === "absolute") {
        if (!scheduledAt) {
          throw new Error("Pick a date and time for absolute follow-up scheduling.");
        }
        return {
          ...relativeFollowUp,
          scheduledAt
        };
      }

      return relativeFollowUp;
    });
  }

  function bindFollowUpCard(card: HTMLElement): void {
    const mode = card.querySelector<HTMLSelectElement>("[data-followup='mode']");
    const relativeBlock = card.querySelector<HTMLElement>("[data-followup-block='relative']");
    const absoluteBlock = card.querySelector<HTMLElement>("[data-followup-block='absolute']");

    if (!mode || !relativeBlock || !absoluteBlock) {
      return;
    }

    const refresh = (): void => {
      const isAbsolute = mode.value === "absolute";
      relativeBlock.classList.toggle("mailstorm-hidden", isAbsolute);
      absoluteBlock.classList.toggle("mailstorm-hidden", !isAbsolute);
    };

    mode.addEventListener("change", refresh);
    refresh();
  }

  function addFollowupCard(): void {
    if (followupCount >= 10) {
      setMessage("Maximum 10 follow-ups allowed.");
      return;
    }

    clearMessage();
    followupCount += 1;
    followupsHost.insertAdjacentHTML("beforeend", buildFollowUpCard(followupCount));
    const latest = followupsHost.lastElementChild as HTMLElement | null;
    if (latest) {
      bindFollowUpCard(latest);
    }
  }

  function switchTab(tabName: string): void {
    overlay.querySelectorAll<HTMLButtonElement>(".mailstorm-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabName);
    });

    overlay.querySelectorAll<HTMLElement>(".mailstorm-section").forEach((section) => {
      section.classList.toggle("active", section.dataset.section === tabName);
    });
  }

  closeBtn.addEventListener("click", close);
  discardBtn.addEventListener("click", close);
  connectBtn.addEventListener("click", () => {
    void runOAuthConnection();
  });
  addFollowupBtn.addEventListener("click", addFollowupCard);

  overlay.querySelectorAll<HTMLButtonElement>(".mailstorm-tab").forEach((tabButton) => {
    tabButton.addEventListener("click", () => {
      switchTab(tabButton.dataset.tab || "messages");
    });
  });

  csvInput.addEventListener("change", async () => {
    clearMessage();
    if (!csvInput.files || csvInput.files.length === 0) {
      parsedCsv = null;
      csvMeta.textContent = "";
      varsHost.innerHTML = "";
      return;
    }

    try {
      parsedCsv = await parseCsv(csvInput.files[0]);
      csvMeta.textContent = `Loaded ${parsedCsv.rows.length} rows | email column: ${parsedCsv.emailColumn}`;
      renderVariables(parsedCsv.headers, parsedCsv.emailColumn);
      setMessage("CSV loaded successfully.", "success");
    } catch (error) {
      parsedCsv = null;
      setMessage((error as Error).message);
    }
  });

  startBtn.addEventListener("click", async () => {
    clearMessage();
    if (!parsedCsv) {
      setMessage("Upload a CSV before starting merge.");
      return;
    }

    const subjectTemplate = subjectInput.value.trim();
    const bodyTemplate = bodyInput.value.trim();

    if (!subjectTemplate || !bodyTemplate) {
      setMessage("Subject and body are required.");
      return;
    }

    try {
      const connected = await ensureConnectedUser();
      if (!connected) {
        return;
      }

      startBtn.disabled = true;
      startBtn.textContent = "Starting...";

      const payload: StartMergeRequest = {
        name: nameInput.value.trim() || undefined,
        subjectTemplate,
        bodyTemplate,
        ccTemplate: ccInput.value.trim() || undefined,
        bccTemplate: bccInput.value.trim() || undefined,
        emailColumn: parsedCsv.emailColumn,
        rows: parsedCsv.rows,
        followUps: readFollowUps()
      };

      const result = await startMerge(payload);
      setMessage(`Merge ${result.id} started. Status: ${result.status}`, "success");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      startBtn.disabled = false;
      startBtn.textContent = "Start mail merge now";
    }
  });

  const health = await checkBackendHealth();
  if (!health.ok) {
    setMessage("Backend is unreachable on http://localhost:8787. Start backend first.");
  } else {
    setMessage(`Connected to backend (${health.providerName || "unknown provider"}).`, "success");
    void ensureConnectedUser();
  }

  addFollowupCard();

  return new Promise((resolve) => {
    overlay.addEventListener("remove", () => resolve({}), { once: true });
    closeBtn.addEventListener(
      "click",
      () => {
        resolve({});
      },
      { once: true }
    );
    discardBtn.addEventListener(
      "click",
      () => {
        resolve({});
      },
      { once: true }
    );
  });
}
