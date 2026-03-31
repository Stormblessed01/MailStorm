export const PANEL_STYLE_ID = "mailstorm-style";

export const PANEL_CSS = `
.mailstorm-left-nav-wrap {
  margin: 10px 0 0 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mailstorm-left-nav-button {
  border: 0;
  border-radius: 16px;
  padding: 10px 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #0d284f;
  background: linear-gradient(130deg, #d8efff 0%, #d7ffe5 100%);
  box-shadow: 0 6px 14px rgba(12, 57, 110, 0.14);
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.mailstorm-left-nav-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 9px 16px rgba(12, 57, 110, 0.16);
}

.mailstorm-left-nav-button-secondary {
  background: linear-gradient(130deg, #efe7ff 0%, #dbedff 100%);
}

.mailstorm-left-nav-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #214f9f;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
}

.mailstorm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(9, 14, 22, 0.35);
  z-index: 2147483647;
  display: flex;
  justify-content: flex-end;
}

.mailstorm-panel {
  width: min(510px, 98vw);
  height: 100vh;
  background: radial-gradient(120% 80% at 10% 0%, #eff4ff 0%, #eefdf3 48%, #f9f7ec 100%);
  box-shadow: -20px 0 45px rgba(7, 21, 48, 0.2);
  display: flex;
  flex-direction: column;
  font-family: "Trebuchet MS", "Segoe UI", sans-serif;
}

.mailstorm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px 10px;
  border-bottom: 1px solid #d9e4ef;
}

.mailstorm-title {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #102a52;
}

.mailstorm-subtitle {
  margin-top: 2px;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #42648f;
}

.mailstorm-close {
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 22px;
  color: #334960;
}

.mailstorm-tabs {
  display: flex;
  border-bottom: 1px solid #d9dce3;
  padding: 0 20px;
  gap: 18px;
}

.mailstorm-tab {
  border: 0;
  padding: 13px 0;
  background: transparent;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #5a6881;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.mailstorm-tab.active {
  color: #1f4db2;
  border-bottom-color: #1f4db2;
}

.mailstorm-body {
  flex: 1;
  overflow: auto;
  padding: 18px 20px;
}

.mailstorm-compose-shell,
.mailstorm-tracking-shell {
  display: none;
}

.mailstorm-compose-shell.active,
.mailstorm-tracking-shell.active {
  display: block;
}

.mailstorm-section {
  display: none;
}

.mailstorm-section.active {
  display: block;
}

.mailstorm-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.mailstorm-field label {
  font-size: 12px;
  font-weight: 700;
  color: #4f5c74;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.mailstorm-input,
.mailstorm-textarea,
.mailstorm-select {
  border: 1px solid #cad5e2;
  border-radius: 12px;
  padding: 11px;
  font-size: 14px;
  background: #ffffffd9;
  outline: none;
}

.mailstorm-input:focus,
.mailstorm-textarea:focus,
.mailstorm-select:focus {
  border-color: #2f66c8;
  box-shadow: 0 0 0 3px rgba(47, 102, 200, 0.16);
}

.mailstorm-textarea {
  min-height: 130px;
  resize: vertical;
}

.mailstorm-upload {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.mailstorm-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mailstorm-chip {
  border-radius: 999px;
  border: 1px solid #bfd0ff;
  background: #e8efff;
  color: #133572;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}

.mailstorm-followup-card {
  border: 1px solid #d5dfeb;
  background: #ffffffeb;
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: 0 6px 18px rgba(27, 41, 75, 0.08);
}

.mailstorm-followup-title {
  font-size: 13px;
  font-weight: 700;
  color: #163965;
  margin-bottom: 10px;
}

.mailstorm-history {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mailstorm-history-item {
  border: 1px solid #d6e0ee;
  border-radius: 14px;
  background: #ffffffea;
  padding: 14px;
}

.mailstorm-history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mailstorm-history-time {
  margin-top: 6px;
  font-size: 12px;
  color: #60718e;
}

.mailstorm-badge {
  background: #e5f3eb;
  color: #1d6b47;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.mailstorm-track-list {
  margin: 10px 0 0;
  padding-left: 18px;
  color: #1f304c;
  font-size: 13px;
  line-height: 1.5;
}

.mailstorm-footer {
  border-top: 1px solid #d9dce3;
  padding: 14px 20px;
  display: flex;
  gap: 10px;
}

.mailstorm-primary {
  border: 0;
  background: linear-gradient(130deg, #1f66d9 0%, #2a7ec7 100%);
  color: #fff;
  border-radius: 12px;
  padding: 11px 14px;
  font-weight: 700;
  cursor: pointer;
}

.mailstorm-secondary {
  border: 0;
  background: #edf3fa;
  color: #27304a;
  border-radius: 12px;
  padding: 11px 14px;
  font-weight: 600;
  cursor: pointer;
}

.mailstorm-help {
  font-size: 12px;
  color: #5f6472;
  margin-bottom: 10px;
}

.mailstorm-error {
  color: #b12028;
  font-size: 13px;
  margin-top: 6px;
}

.mailstorm-success {
  color: #0f7f3d;
  font-size: 13px;
  margin-top: 6px;
}

.mailstorm-hidden {
  display: none;
}

.mailstorm-track-title {
  font-size: 22px;
  font-weight: 700;
  color: #1c3156;
  margin-bottom: 12px;
}

.mailstorm-track-table {
  border: 1px solid #d7e1ef;
  border-radius: 14px;
  background: #ffffffeb;
  overflow: hidden;
}

.mailstorm-track-head,
.mailstorm-track-row {
  display: grid;
  grid-template-columns: 2.2fr 1fr 0.6fr 0.7fr 1fr;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
}

.mailstorm-track-head {
  background: #f2f6fd;
  color: #445a80;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
}

.mailstorm-track-row {
  width: 100%;
  border: 0;
  background: #fff;
  text-align: left;
  border-top: 1px solid #edf2fb;
  cursor: pointer;
}

.mailstorm-track-row:hover {
  background: #f8fbff;
}

.mailstorm-track-col {
  font-size: 13px;
  color: #22324e;
}

.mailstorm-track-col.name {
  font-weight: 600;
}

.mailstorm-track-breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.mailstorm-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.mailstorm-metric-card {
  border: 1px solid #d4dfef;
  border-radius: 12px;
  background: #ffffff;
  padding: 10px;
}

.mailstorm-metric-card .k {
  font-size: 11px;
  text-transform: uppercase;
  color: #6a7995;
  letter-spacing: 0.04em;
}

.mailstorm-metric-card .v {
  margin-top: 4px;
  font-size: 20px;
  color: #1c345f;
  font-weight: 700;
}

.mailstorm-recipient-table {
  border: 1px solid #d7e1ef;
  border-radius: 12px;
  overflow: hidden;
  background: #ffffff;
}

.mailstorm-recipient-head,
.mailstorm-recipient-row {
  display: grid;
  grid-template-columns: 2fr 1.3fr 1fr 1fr;
  gap: 10px;
  padding: 10px 12px;
  align-items: center;
}

.mailstorm-recipient-head {
  background: #f3f7fe;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: #4f6387;
}

.mailstorm-recipient-row {
  width: 100%;
  border: 0;
  border-top: 1px solid #eef3fb;
  background: #fff;
  text-align: left;
  font-size: 13px;
  cursor: pointer;
}

.mailstorm-recipient-row:hover {
  background: #f8fbff;
}

.mailstorm-followup-visual {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.08em;
  color: #37577f;
}

.mailstorm-thread-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mailstorm-thread-item {
  border: 1px solid #d8e1ef;
  border-radius: 12px;
  background: #ffffff;
  padding: 12px;
}

.mailstorm-thread-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}

.mailstorm-thread-meta {
  margin-top: 6px;
  color: #5f7090;
  font-size: 12px;
}

.mailstorm-thread-body {
  margin-top: 8px;
  color: #1e2a43;
  font-size: 13px;
  line-height: 1.5;
}

@media (max-width: 820px) {
  .mailstorm-panel {
    width: 100vw;
  }

  .mailstorm-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
`;

export function ensureStyles(): void {
  if (document.getElementById(PANEL_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = PANEL_STYLE_ID;
  style.textContent = PANEL_CSS;
  document.head.appendChild(style);
}
