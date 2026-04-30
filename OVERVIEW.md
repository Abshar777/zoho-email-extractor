# Zoho Mail Extractor — App Overview

## What It Does

A **Next.js 14 web app** that lets users connect their own Zoho Mail account via OAuth and:

- Browse all emails (10,000+) with real-time loading
- Search and filter emails by keyword, sender, date range, attachment presence, read/unread status
- View full email body in a modal
- Export the **entire inbox to an Excel (.xlsx) file**, including email bodies — with progress tracking

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Excel Export | `xlsx` (SheetJS) |
| Date Utils | `date-fns` |
| Auth | Zoho OAuth 2.0 (custom, cookie-based) |
| Deployment | `https://zoho-email-extractor.deltaacademy.ae` |

---

## App Flow

```
Landing Page (/)
    │
    ├─ No credentials? → Setup Wizard (/setup)
    │       1. Instructions to create a Zoho API app
    │       2. Enter Client ID + Client Secret
    │       3. Copy the Redirect URI → add to Zoho console → Connect
    │
    └─ Has credentials? → Connect Zoho Mail → OAuth callback
                                                    │
                                            Stores tokens in cookies
                                                    │
                                            Dashboard (/dashboard)
```

---

## Key Pages & Components

### Pages
| Route | Purpose |
|---|---|
| `/` | Landing — connect or go to setup |
| `/setup` | 3-step wizard to enter Zoho API credentials |
| `/dashboard` | Main view — email list with filters and export |

### Components
| File | Role |
|---|---|
| `SetupWizard.tsx` | 3-step form: instructions → credentials → redirect URI copy |
| `Dashboard.tsx` | Loads all emails progressively, applies client-side filters, paginates |
| `EmailModal.tsx` | Full email detail view (fetches body on demand) |
| `ExportButton.tsx` | Triggers the export job and polls for progress |

---

## API Routes

| Route | Method | What it does |
|---|---|---|
| `/api/auth/connect` | GET | Redirects to Zoho OAuth authorization URL |
| `/api/auth/callback` | GET | Exchanges auth code for tokens, stores in cookies |
| `/api/auth/logout` | GET/POST | Clears session cookies |
| `/api/setup` | POST | Saves Client ID + Secret to cookies, returns redirect URI |
| `/api/emails` | GET | Fetches a paginated page of email metadata |
| `/api/email` | GET | Fetches a single email body |
| `/api/attachment` | GET | Fetches a single attachment |
| `/api/attachments` | GET | Lists attachments for an email |
| `/api/export` | POST | Starts a background export job → returns `jobId` |
| `/api/export/status` | GET | Polls job progress (phase + counts) |
| `/api/export/download` | GET | Streams the finished `.xlsx` file |

---

## Core Libraries

### `lib/zoho.ts`
All Zoho API interactions:
- `getAuthUrl()` — builds OAuth URL
- `exchangeCode()` — trades auth code for tokens
- `refreshAccessToken()` — refreshes expired tokens
- `getAccount()` — fetches the user's Zoho account info
- `fetchEmailPage()` — fetches one page of emails (up to 200/request)
- `fetchAllEmails()` — loops pages until inbox is fully loaded
- `fetchEmailBody()` — fetches + strips HTML from one email body (with retry on 429)

### `lib/auth.ts`
Session helpers reading from cookies:
- `getCredentials()` — reads Client ID/Secret/RedirectURI
- `getValidToken()` — returns a valid access token, auto-refreshes if expired
- `getSession()` — returns `accountId`, `email`, `refreshToken`

### `lib/jobs.ts`
In-memory job queue for the export process:
- Jobs are keyed by random ID
- Phases: `pending → fetching-list → fetching-bodies → building-excel → done`
- Auto-cleans jobs older than 15 minutes

### `lib/concurrency.ts`
`withConcurrency(tasks, limit)` — runs async tasks with a fixed concurrency cap (10 during export body fetching).

---

## Export Process (Background Job)

1. **Phase 1 — Fetch list**: Calls `fetchAllEmails()` to get all email metadata (no body yet). Updates `fetched` count.
2. **Phase 2 — Fetch bodies**: Fetches each email body with **10 concurrent requests**. Refreshes the access token every 800 emails to avoid expiry on large inboxes.
3. **Phase 3 — Build Excel**: Assembles rows `[#, Date, From, To, CC, Subject, Body, Attachments]` and writes an `.xlsx` file.
4. The client polls `/api/export/status` every 2 seconds and downloads from `/api/export/download` when done.

---

## Authentication & Session Model

- **No server-side database** — all session state lives in **HTTP-only cookies**.
- `zoho_client_id`, `zoho_client_secret`, `zoho_redirect_uri` — stored from setup (30-day max-age)
- `zoho_access_token` — 1-hour max-age, auto-refreshed via refresh token
- `zoho_refresh_token` — 30-day max-age
- `zoho_account_id`, `zoho_email` — stored after successful OAuth, 30-day max-age
- Credentials are **never sent to any backend server** beyond the user's own browser session.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Base URL used for building the OAuth redirect URI (defaults to `https://zoho-email-extractor.deltaacademy.ae`) |

---

## Development

```bash
npm run dev     # starts on port 3000
npm run build   # production build
npm run start   # serves on port 3004
```
