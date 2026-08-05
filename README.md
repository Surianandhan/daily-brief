# Daily Brief

**Live demo: [daily-brief-nine-ruddy.vercel.app](https://daily-brief-nine-ruddy.vercel.app)**

An AI email triage app. It ingests a mock inbox, clusters emails into threads, scores each thread's priority against an explicit rubric, extracts deadlines/action items, and renders a triaged "Daily Brief" (Urgent / This Week / FYI) — with an AI-drafted reply available per thread.

Built in a 2-hour hackathon. No auth, no real Gmail integration, no database — everything runs in-memory off a mocked inbox JSON file.

For a detailed file-by-file walkthrough of the whole system (request lifecycle, every module's job, the resilience mechanics, known quirks), see **[HOW_IT_WORKS.md](./HOW_IT_WORKS.md)**.

## How it works

1. **Landing page** (`/`) shows the raw, unsorted inbox and a **Process My Inbox** button.
2. Clicking it calls `POST /api/process-inbox`, which:
   - Sends the inbox to **Gemini** (via `@google/generative-ai`) with two prompts: one for thread clustering + priority scoring, one for deadline/task extraction (chained sequentially so both share the same `threadId`s).
   - Validates both responses against a strict JSON schema, retrying once on timeout/bad JSON.
   - **Falls back automatically** to a deterministic, rule-based JS engine (`lib/fallbackEngine.js`) if the AI call fails, times out, or is forced via `?fallback=true` — using the exact same scoring rubric and output shape, so the UI never knows or cares which path ran.
3. **Daily Brief** (`/daily-brief`) renders the result in three columns (Urgent / This Week / FYI), tagged with a badge showing whether the AI or the fallback engine produced it.
4. Clicking a thread opens a detail panel with the AI-generated summary, extracted tasks/deadlines, the priority score breakdown, a live "reasoning trace" animation, and an **AI-drafted reply** (`POST /api/draft-reply`) you can regenerate in different tones, edit, and copy.

## Tech stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS**
- **Gemini** (`gemini-3.1-flash-lite`) via `@google/generative-ai` — see note on model choice below
- `framer-motion` + `lucide-react` for the reasoning-trace/timeline/priority UI
- No database — state lives in a React Context (`lib/BriefContext.tsx`) for the duration of the browser session

## Project structure

```
app/
  page.tsx                      landing page: inbox list + Process My Inbox
  daily-brief/page.tsx          three-column triage board
  api/process-inbox/route.ts    AI + fallback triage pipeline
  api/draft-reply/route.ts      AI reply drafting endpoint
components/
  ThreadDetail.tsx              thread detail panel (summary/tasks/trace/reply tabs)
  DraftResponse.tsx             AI reply drafting UI
  ReasoningTrace.tsx            live "AI reasoning" animation
  TimelineStrip.tsx             deadline horizon overview
  PriorityBadge.tsx             priority/fallback badges
lib/
  gemini.ts                     Gemini client, timeout + retry + JSON parsing
  fallbackEngine.js             deterministic rule-based triage engine
  types.ts                      shared API/UI types
data/
  mock-inbox.json               40 mock emails (no threadId — clustering is the AI's job)
```

## Running locally

```bash
npm install
cp .env.example .env   # then fill in GEMINI_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | No | Free key from [aistudio.google.com](https://aistudio.google.com). Without it (or if the call fails), every request transparently falls back to the rule-based engine — the app still works. |

### Forcing the fallback engine

Append `?fallback=true` to a `/api/process-inbox` request (or wire a UI toggle) to force the rule-based path regardless of whether a Gemini key is set — useful for demoing the resilience story live.

### A note on the Gemini model

The original spec targeted `gemini-2.5-flash-lite`, but that model has since been deprecated for new API keys ("no longer available to new users") even though it still appears in the models list. This build uses `gemini-3.1-flash-lite` instead, verified working against a live key. If your key doesn't have access to that model, check `GET https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY` for what's available to you and update `MODEL_NAME` in `lib/gemini.ts`.

## Deploying

Deployed on Vercel at [daily-brief-nine-ruddy.vercel.app](https://daily-brief-nine-ruddy.vercel.app), auto-redeploying on every push to `main`. `GEMINI_API_KEY` is set as an environment variable in the Vercel project dashboard (never commit it — `.env` is gitignored).

To redeploy elsewhere: import this repo at [vercel.com/new](https://vercel.com/new), or run `vercel` from the project root, and set `GEMINI_API_KEY` in the new project's environment variables.

## Constraints (by design)

No auth, no login screen, no real Gmail/OAuth integration, no database/persistence. Everything runs off the mocked inbox in `data/mock-inbox.json`, in-memory, for a single demo session. Max 1–2 Gemini calls per "Process My Inbox" click.
