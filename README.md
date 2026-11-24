# Daily Brief

**Live: [daily-brief-nine-ruddy.vercel.app](https://daily-brief-nine-ruddy.vercel.app)**

An AI email triage app for Gmail. Sign in with Google and it reads your recent inbox (read-only), groups it into conversations, scores each one against an explicit rubric, extracts deadlines and action items, and renders a triaged "Daily Brief" (Urgent / This Week / FYI), with an AI-drafted reply available for each thread.

## Project history

**Hackathon version: up to commit [`68bc7a1`](https://github.com/surianandhan/daily-brief/tree/68bc7a1) (5 Aug 2026).** Built in a 2-hour hackathon for the interview round at **Prodapt** (Chennai). Everything up to and including that commit was the hackathon submission. That version had no auth, no real Gmail integration and no database, and ran in memory from a mock inbox JSON file.

**After the hackathon.** Every change after that commit is my own personal work, done out of interest. None of it was part of the interview submission. The main change: the mock inbox is gone, and the app now works on your real Gmail.

[HOW_IT_WORKS.md](./HOW_IT_WORKS.md) is a detailed file-by-file walkthrough of the hackathon version.

## How it works

1. **Sign in with Google** (`/api/auth/login` → Google → `/api/auth/callback`). The app asks for your email address and **read-only** Gmail access only. The Google access token (valid ~1 hour, no refresh token) is kept in an encrypted, HTTP-only cookie. There is no database.
2. **Landing page** (`/`) lists your recent inbox: up to 30 emails from the last 7 days, skipping the Promotions and Social tabs.
3. **Process My Inbox** calls `GET /api/process-inbox`, which:
   - Fetches those emails from the Gmail API, converts HTML to plain text, strips quoted earlier replies, and trims long bodies.
   - Groups them by Gmail's own thread ID (no guessing which emails belong together).
   - Sends all threads to **Gemini** in one call to score them (sender importance 0–4 + deadline proximity 0–4 + action required 0–2), summarise them, and extract tasks and deadlines. The prompt includes the current time in your time zone, and tells the model that email text is untrusted data.
   - Validates the JSON and applies the rubric on the server (clamping each part, summing, and bucketing 8–10 / 4–7 / 0–3).
   - **Falls back automatically** to the deterministic rule-based engine in `lib/fallbackEngine.js` if Gemini fails, times out or is rate-limited, or if forced with `?fallback=true`. It uses the same rubric and output shape, with Gmail's Starred/Important/category labels as the sender signal. If Gemini skips individual threads, only those are scored by the rule engine.
4. **Daily Brief** (`/daily-brief`) shows three columns plus a deadline strip (due ≤ 24h / this week / no deadline) that filters them.
5. **Thread detail** shows the summary, tasks, score breakdown and an **AI-drafted reply** (`POST /api/draft-reply`). The draft is written from the real conversation, which the server fetches from Gmail. You can change the tone, edit it, then **Copy & Open in Gmail** to send it yourself. The app never sends email.

## Privacy, in short

- Read-only Gmail scope (`gmail.readonly`). It can't send, delete or modify mail.
- No database and no stored email. The brief lives only in your browser tab.
- Signing out deletes the cookie and revokes the token at Google.
- **The app is run at zero cost, so it uses the free tier of the Gemini API.** On the free tier, Google may use submitted content to improve its products, and human reviewers may read it ([Gemini API terms](https://ai.google.dev/gemini-api/terms)). Google's terms also say not to send personal information to the free tier. Users are told this clearly before they sign in, and in the Privacy Policy. Switching to a paid Gemini key (a Cloud Billing account on the key's project) removes this, and then the Privacy Policy should be updated to match.
- Full policy: `/privacy` ([app/privacy/page.tsx](./app/privacy/page.tsx)). Terms: `/terms`.

## Tech stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS**
- **Gmail REST API** via `fetch` with hand-rolled Google OAuth (PKCE + state, AES-256-GCM session cookie). No auth library or Google SDK needed.
- **Gemini** (`gemini-flash-lite-latest`, with fallbacks) via `@google/generative-ai`
- `framer-motion` + `lucide-react` for the UI

## Project structure

```
app/
  page.tsx                      sign-in screen, or your inbox when signed in
  daily-brief/page.tsx          three-column triage board + deadline strip
  privacy/page.tsx, terms/      Privacy Policy and Terms (needed for Google verification)
  api/auth/login|callback|logout  Google sign-in / sign-out
  api/process-inbox/route.ts    Gmail → Gemini triage, with rule-based fallback
  api/draft-reply/route.ts      AI reply drafting from the real Gmail thread
components/
  SignIn.tsx, InboxView.tsx     landing page states
  ThreadDetail.tsx              thread detail panel (summary/tasks/trace/reply tabs)
  DraftResponse.tsx             AI reply drafting UI
  ReasoningTrace.tsx            pipeline animation (describes the real steps)
  TimelineStrip.tsx             deadline strip / filter
  PriorityBadge.tsx             priority + AI/fallback badges
lib/
  auth.ts                       OAuth helpers + encrypted session cookie
  gmail.ts                      Gmail API reads + email cleanup
  gemini.ts                     Gemini client, timeout + retry + JSON parsing
  fallbackEngine.js             deterministic rule-based triage engine
  rateLimit.ts                  in-memory per-account rate limiting
  types.ts                      shared API/UI types
```

## Setup

### 1. Google Cloud (one time, ~15 minutes)

In [Google Cloud Console](https://console.cloud.google.com):

1. Create a project (e.g. "Daily Brief").
2. **APIs & Services → Library**: enable the **Gmail API**.
3. **Google Auth Platform → Get started** (the OAuth consent screen): app name `Daily Brief`, your email as the support and contact email, audience **External**. **Don't upload a logo**: a logo forces Google's verification review.
4. **Data Access → Add or remove scopes**: paste `https://www.googleapis.com/auth/gmail.readonly` into "Manually add scopes", and tick `.../auth/userinfo.email` and `openid`. Save.
5. **Clients → Create client → Web application**, name `Daily Brief`. Under **Authorized redirect URIs** add:
   - `https://daily-brief-nine-ruddy.vercel.app/api/auth/callback`
   - `http://localhost:3000/api/auth/callback` (for local development)
6. Copy the **Client ID** and **Client secret** (the secret is only shown once).
7. **Audience → Publish app** (status "In production"). This makes sign-in public. Google shows an "unverified app" warning, and users click **Advanced → Go to Daily Brief** to continue. (Leaving it in "Testing" instead limits sign-in to test users you list.)

### 2. Environment variables

Copy `.env.example` to `.env` for local use, and set the same values in Vercel (**Project → Settings → Environment Variables**). Never commit real values.

| Variable | Required | Notes |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Yes | From step 1.6 |
| `GOOGLE_CLIENT_SECRET` | Yes | From step 1.6 |
| `GEMINI_API_KEY` | Recommended | Free key from [aistudio.google.com](https://aistudio.google.com) (see Privacy above). Without it, everything uses the rule-based engine and drafting is unavailable. |
| `GEMINI_MODELS` | No | Comma-separated Gemini models to try in order when one is busy. Default: `gemini-flash-lite-latest,gemini-3.1-flash-lite,gemini-flash-latest` |
| `AUTH_SECRET` | No | Encrypts the session cookie. If unset, a key is derived from `GOOGLE_CLIENT_SECRET`. |
| `CONTACT_EMAIL` | No | Shown on the Privacy and Terms pages. If unset, they link to this repo's GitHub issues. |

### 3. Run locally

```bash
npm install
cp .env.example .env   # then fill in the values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying

Deployed on Vercel, auto-redeploying on every push to `main`. After setting the environment variables above, redeploy so they take effect. Make sure the deployed URL's `/api/auth/callback` is listed in the Google client's redirect URIs.

## Public access, and its free-tier limits

`gmail.readonly` is a Google **restricted scope**. This project deliberately stays free, so it is **published but not verified** by Google:

- Anyone with a Google account can sign in, after clicking past Google's "unverified app" warning.
- Google caps unverified apps using restricted scopes at **100 users over the project's lifetime**, after which new sign-ins are blocked ([Google: Unverified apps](https://support.google.com/cloud/answer/7454865)).
- Removing the warning and the cap requires Google's verification. That needs a domain you own, a paid-tier Gemini key (so the Privacy Policy can honestly say Google won't use the data), a demo video, and an annual third-party [security assessment](https://support.google.com/cloud/answer/13465431) (CASA), which costs money. None of that is done here.

## Limits

- Reads at most 30 recent inbox emails (`INBOX_QUERY` / `MAX_EMAILS` in `lib/gmail.ts`).
- Rate limits are in memory per serverless instance (3 triage runs and 5 drafts per minute per account). This is fine at small scale, but needs a shared store if traffic grows.
- Sessions last about an hour; after that you sign in again.
- Free-tier Gemini rate limits are low and models are sometimes overloaded. The app tries each model in `GEMINI_MODELS` in turn, and if all fail it uses the rule-based engine.
- Gmail limits each user's API usage per minute, and reading a full email is relatively expensive. Several quick refreshes can hit that limit. The app then says so, and it clears within about a minute.

## A note on the Gemini model

The original spec targeted `gemini-2.5-flash-lite`, which is no longer available to new API keys. The app now tries `gemini-flash-lite-latest` (Google's alias for the newest Flash-Lite model), then `gemini-3.1-flash-lite`, then `gemini-flash-latest`, moving on whenever one is overloaded or fails. To change the list, set `GEMINI_MODELS`. To see which models your key can use, call `GET https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY`.
