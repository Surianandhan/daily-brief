# How Daily Brief Works

A file-by-file walkthrough of the whole system, for anyone on the team (or judging it) who wants to understand what's actually happening, not just how to run it. Read `README.md` first for the pitch and setup steps — this doc is the "and here's exactly how" companion.

**Live:** https://daily-brief-nine-ruddy.vercel.app

---

## 1. The one-sentence version

You click a button on a messy inbox. The server sends that inbox to Gemini with two prompts (cluster + score, then extract deadlines), validates the JSON it gets back, and — if that fails for any reason — silently swaps in a hand-written JavaScript rule engine that produces the exact same shape of output. The frontend renders whatever it got and never knows or cares which path produced it.

---

## 2. The full request lifecycle

```
User clicks "Process My Inbox"
        │
        ▼
GET /api/process-inbox  (app/api/process-inbox/route.ts)
        │
        ├─ loadInbox() reads data/mock-inbox.json (40 emails, flat, no threadId)
        │
        ├─ ?fallback=true in the URL? ──yes──▶ skip straight to the fallback engine
        │
        ├─ no → runAi(emails):
        │     1. Send TRIAGE_PROMPT + all emails to Gemini
        │        → validate response matches { threads: [...] } schema
        │        → retry once on timeout / bad JSON / schema mismatch
        │     2. Take triage's OWN threadIds + emailIds, regroup the original
        │        emails by those threads, send THAT (not the raw email list)
        │        to Gemini again with EXTRACTION_PROMPT
        │        → same validate + retry-once logic
        │     3. Merge: attach each thread's extracted tasks by threadId
        │     4. Return { threads, timeline, mode: "ai" }
        │
        │  If step 1 or 2 throws after its retry → caught, logged,
        │  falls through to:
        │
        └─ runFallback(emails):
              1. fallbackEngine.processInbox(emails) — pure JS, no network call
              2. Same merge logic, same output shape
              3. Return { threads, timeline, mode: "fallback" }
        │
        ▼
Response: { threads: OutputThread[], timeline: TimelineItem[], mode: "ai"|"fallback" }
        │
        ▼
Client stores it in React Context (lib/BriefContext.tsx), navigates to /daily-brief
        │
        ▼
/daily-brief renders three columns by thread.bucket, badges show mode,
click a thread → ThreadDetail panel → tabs for Reply / Summary+Tasks / Trace
```

**Why extraction is chained off triage instead of run in parallel:** early on, both calls ran in parallel and independently invented their own `threadId` values — so extraction's IDs never matched triage's IDs and the merge silently produced zero tasks for every thread. Fixed by running triage first, then feeding *its* thread groupings into the extraction prompt. This is the single most important correctness detail in the whole pipeline — mention it if anyone asks "how do you know the AI output is actually reliable."

---

## 3. File-by-file

### `data/mock-inbox.json`
40 hand-written emails across ~10-15 real topics (Q3 roadmap deadline, a production outage, an overdue invoice, internship interviews, a hotfix deployment, plus newsletters/spam mixed in). Schema: `{ id, from, subject, timestamp, body }` — deliberately **no `threadId`**, because clustering emails into threads is the thing being tested, not something to hand the AI pre-solved.

### `lib/fallbackEngine.js`
Pure JavaScript, zero network calls, zero AI. Three functions plus a combining entrypoint:
- `clusterThreads(emails)` — normalizes subject lines (strips `Re:`/`Fwd:`, lowercases) and groups by word-overlap similarity (Jaccard, threshold 0.4).
- `scorePriority(thread)` — same 0–10 rubric as the AI prompt: sender importance (VIP/colleague/noise lists) + deadline proximity (regex for "today"/"EOD"/explicit dates, with real date-math for "by Friday" style phrases) + action-required keyword matching.
- `extractDeadlines(thread)` — sentence-level regex matching against a curated list of deadline-intent phrases, dedup'd.
- `processInbox(emails)` — runs all three plus a deterministic summary generator, returns the same shape the AI path returns. This is what the API route actually calls.

### `lib/gemini.ts`
The Gemini client wrapper. Model is `gemini-3.1-flash-lite` (see §5 below for why not 2.5). `callGeminiJSON(prompt, validator)`: calls Gemini with a 5-second timeout (native SDK support via `requestOptions.timeout`), strips markdown code fences from the response, `JSON.parse`s it, runs it through a type-guard validator, and retries once if any of that fails. Throws only after both attempts are exhausted — logs the real underlying error both times so failures are debuggable instead of silent.

### `lib/types.ts`
Single source of truth for the shapes both the API and the frontend agree on: `Email`, `Bucket` (`"urgent" | "this_week" | "fyi"`), `ScoreBreakdown`, `OutputThread`, `TimelineItem`, `ProcessInboxResponse`. Imported by both `route.ts` and every component that touches thread data — this is what keeps the AI path, fallback path, and UI from drifting out of sync.

### `lib/BriefContext.tsx`
A React Context holding the last `ProcessInboxResponse`. No database, no localStorage — this is intentionally just in-memory for the browser session, per the "no persistence" constraint. The landing page writes to it after a successful fetch; the Daily Brief page reads from it (and re-fetches itself if someone lands there directly with nothing in context yet).

### `app/api/process-inbox/route.ts`
The orchestrator described in §2. Owns the AI/fallback decision, the `?fallback=true` demo switch, and the JSON schema validators (`isBucket`, `isScoreBreakdown`, `isTriageResponse`, `isExtractionResponse`) that gate whether an AI response is trusted or discarded.

### `app/api/draft-reply/route.ts`
Separate endpoint, same validate-and-retry pattern as above, no fallback (there's no rule-based reply drafter — if this fails, the UI just shows an error rather than an ersatz template). Takes `{ subject, emails, tone }`, returns `{ draft }`.

### `app/page.tsx`
Landing page. Renders the raw `mock-inbox.json` list untouched (proving the AI/fallback engine did real clustering work, not something pre-sorted). "Process My Inbox" button fires the fetch, shows `ReasoningTrace` while waiting, pushes the result into context, and navigates to `/daily-brief`.

### `app/daily-brief/page.tsx`
Three-column board (`Urgent` / `This Week` / `FYI`), filtered from `data.threads` by `bucket`. Shows the `FallbackBadge` (from `PriorityBadge.tsx`) so it's visually obvious which engine produced the result. Clicking a card opens `ThreadDetail`.

### `components/ThreadDetail.tsx`
Slide-over panel with three tabs:
- **Reply** (default tab) — renders `DraftResponse`.
- **Summary & Tasks** — the AI/fallback summary, extracted tasks with deadlines, and the raw score breakdown (sender/deadline/action points).
- **Trace** — `ReasoningTrace` in the mode matching how this thread was actually produced.

### `components/DraftResponse.tsx`
Calls `POST /api/draft-reply` on mount and whenever you pick a different tone chip (Approve & Proceed / Request Extension / Urgent Escalation / Acknowledge Receipt — each maps to a different tone string sent to Gemini, not a canned template). Editable textarea, copy button, and a "Send" button that's UI-only (confetti, no real Gmail send — out of scope by design).

### `components/ReasoningTrace.tsx`, `TimelineStrip.tsx`, `PriorityBadge.tsx`
Visual/demo layer — the "AI is thinking" staged animation, the deadline-horizon overview strip, and the priority/fallback badges. Self-contained, driven by props from the pages above.

---

## 4. The resilience story, precisely

This is the thing to lead with in a demo, so get the mechanics exactly right:

- **Trigger conditions for fallback:** Gemini errors, times out (5s, hard limit), returns non-JSON, or returns JSON that fails schema validation — after one retry on each of those.
- **Forced fallback:** `?fallback=true` on `/api/process-inbox` skips the AI attempt entirely. There's no UI toggle for this yet — it's a query param, demo it via the URL bar or `curl`.
- **What's identical either way:** the response shape (`{ threads, timeline, mode }`), the scoring rubric (same 0–10 breakdown), the components that render it. The only difference the UI shows is one badge.
- **What's different either way:** the fallback engine's summaries are deterministic templates ("[N emails] Latest from X: ..."), not generated prose. The AI path's deadline extraction resolves relative dates ("today") to real ISO timestamps in some cases; the fallback keeps them as extracted phrases ("today", "EOD").

---

## 5. Known quirks worth knowing about

- **Model name:** the spec called for `gemini-2.5-flash-lite`. That model returns `404 ... no longer available to new users` on freshly-created API keys even though it still appears in the `/models` list. Swapped to `gemini-3.1-flash-lite`, verified working. If a different key is used later and this breaks again, check `GET https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY` for what that key actually has access to.
- **Free-tier rate limits:** after heavy testing, the same key can start returning slow responses that trip the 5-second timeout, which triggers the fallback path — this is expected, not a bug, and it's arguably a good thing to see live since it's the resilience story proving itself.
- **`/api/draft-reply` has no fallback engine** — unlike triage, there's no rule-based reply drafter, so a Gemini failure there surfaces as a visible error in the UI rather than degrading silently. Acceptable given it's the lower-priority endpoint per the original spec.

---

## 6. Constraints, and why

No auth, no login, no real Gmail/OAuth, no database. All state is in-memory for one browser session (`BriefContext`) or comes fresh from `mock-inbox.json` on each server request. This was a deliberate 2-hour-hackathon scoping call, not an oversight — every one of those features would have eaten build time without moving the thing that's actually being judged: does the AI reasoning work, and does the app survive when it doesn't.
