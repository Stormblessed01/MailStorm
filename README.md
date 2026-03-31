# Mailstorm (Deployable Gmail Mail Merge Extension)

TypeScript project with a modular structure:

- `frontend`: Chrome extension that augments Gmail compose with a Mail Merge panel.
- `backend`: API + scheduler that tracks each merge and sends follow-ups.

## Features implemented

1. Gmail compose integration
- Adds a `Mail Merge` button in each Gmail compose window.
- Opens a side panel with tabs (`Messages`, `Recipients`, `Advanced`) similar to your reference UI.

2. CSV upload + variable templating
- Upload CSV in panel.
- Auto-detects email column (`email`, `mail`, etc. or best match by valid email count).
- Uses row headers as variables, usable as placeholders like `{{name}}`, `{{designation}}` in subject/body.

3. Merge tracking
- Every run is saved as one merge object in backend store (`backend/data/store.json`).
- Tracking is available from a dedicated left-sidebar tracking button.

4. Follow-ups (up to 10) + stop on reply
- Configure up to 10 follow-ups in `Advanced` tab.
- Scheduler checks every minute and sends due follow-ups.
- Before each follow-up, backend checks if recipient replied in the same Gmail thread; if yes, pending follow-ups are skipped.

5. Multi-user OAuth
- Each user connects their own Gmail account via Google OAuth.
- Merge and tracking data are scoped per authenticated user session.

## Gmail sending mode

There are 2 modes:

- `multi-user gmail-api` mode (recommended): each user signs in and sends from their own Gmail.
- `mock` mode (fallback): no real emails sent, useful for local UI testing.

If Gmail env vars are missing, backend uses mock mode.

## Local Setup

## 1) Install dependencies

```bash
npm run install:all
```

## 2) Backend config

Copy `backend/.env.example` to `backend/.env` and set OAuth credentials.

```env
PORT=8787
FRONTEND_ORIGIN=https://mail.google.com
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=http://localhost:8787/api/auth/google/callback
```

## 3) Start backend

```bash
npm run dev:backend
```

## 4) Build extension

```bash
npm run build:frontend
```

### Build extension for deployed backend

Set environment variables before building frontend:

```bash
MAILSTORM_API_BASE=https://your-render-service.onrender.com/api \
MAILSTORM_BACKEND_ORIGIN=https://your-render-service.onrender.com \
npm run build:frontend
```

This injects production API URL and host permissions into `frontend/dist/manifest.json`.

## 5) Load extension in Chrome

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select `frontend/dist`
5. Open Gmail and click compose. You should see `Mail Merge` button.

## API endpoints

- `GET /api/health`
- `POST /api/auth/google/start`
- `GET /api/auth/google/callback`
- `GET /api/auth/google/status/:flowId`
- `GET /api/auth/me`
- `GET /api/merges`
- `GET /api/merges/:id`
- `GET /api/merges/:id/recipients/:recipientId/thread`
- `POST /api/merges/start`

## Deploy On Render (Backend)

1. Push this repo to GitHub.
2. Create a new Render Web Service from your repo.
3. Use `render.yaml` at repo root.
4. Set secrets in Render dashboard:
	- `GMAIL_CLIENT_ID`
	- `GMAIL_CLIENT_SECRET`
	- `GMAIL_REDIRECT_URI` = `https://your-render-service.onrender.com/api/auth/google/callback`
5. Set `FRONTEND_ORIGIN` to comma-separated origins allowed to call API.

6. In Google Cloud OAuth client settings, add the exact Render callback URL as an authorized redirect URI.

After deploy, verify:

- `https://your-render-service.onrender.com/api/health`

## Deploy On Vercel (Public Pages)

This repo includes simple public pages under `site/` and `vercel.json` routes:

- `/`
- `/privacy`
- `/terms`

Use these URLs for OAuth consent branding/policy references.

## Publish Extension For Anyone

1. Build frontend with production backend variables.
2. Zip contents of `frontend/dist`.
3. Publish on Chrome Web Store.
4. Update extension listing with privacy/terms URLs (your Vercel domain).

## End-user Flow

1. User installs extension.
2. User clicks `Connect Gmail` in Mailstorm panel.
3. OAuth tab opens, user grants access.
4. User returns to Gmail and starts campaigns with their own mailbox.

## Notes

- Reply detection relies on Gmail API thread access.
- In mock mode, follow-up flow and merge tracking still work, but real sending/reply detection are simulated.
