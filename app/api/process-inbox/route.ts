import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { callGeminiJSON } from "@/lib/gemini";
import { processInbox } from "@/lib/fallbackEngine.js";
import { checkRateLimit, getClientKey } from "@/lib/rateLimit";
import type {
  Email,
  Bucket,
  ScoreBreakdown,
  TriageThread,
  ExtractedTask,
  OutputThread,
  TimelineItem,
  ProcessInboxResponse,
} from "@/lib/types";

export const dynamic = "force-dynamic";
// Worst case is 2 sequential Gemini calls x 2 attempts x 5s timeout = up to
// 20s. Without this, Vercel's default serverless function timeout (10s on
// Hobby) can kill the function before our own try/catch ever gets to fall
// back, turning a graceful degradation into a raw 504 to the browser.
export const maxDuration = 30;

type TriageResponse = { threads: TriageThread[] };
type ThreadExtraction = { threadId: string; tasks: ExtractedTask[] };
type ExtractionResponse = { extractions: ThreadExtraction[] };

const TRIAGE_PROMPT = `You are an email triage assistant. You will receive a JSON array of emails.

1. Group emails into threads based on subject, participants, and content
   (a thread may contain 1 or many emails).
2. For each thread, score priority 1-10 using this rubric:
   - Sender importance (0-4): known VIP/manager/client = 4, colleague = 2,
     unknown/newsletter = 0
   - Deadline proximity (0-4): due <24h = 4, due this week = 2, no
     deadline = 0
   - Action-required language (0-2): explicit ask/question = 2, FYI only = 0
3. Bucket each thread: "urgent" (8-10), "this_week" (4-7), "fyi" (0-3).

Return ONLY valid JSON, no other text:
{
  "threads": [
    {
      "threadId": "string", "subject": "string", "emailIds": ["string"],
      "priorityScore": 0, "bucket": "urgent | this_week | fyi",
      "scoreBreakdown": { "senderImportance": 0, "deadlineProximity": 0,
      "actionRequired": 0 },
      "summary": "1-2 sentence thread-level summary, not per-email"
    }
  ]
}`;

const EXTRACTION_PROMPT = `For each thread below, extract any deadlines or action items mentioned
anywhere in the email bodies. If no deadline is stated explicitly, set
deadline to null — do not invent one.

Return ONLY valid JSON:
{ "extractions": [
    { "threadId": "string", "tasks": [{ "description": "string",
      "deadline": "string|null" }] } ] }`;

function isBucket(value: unknown): value is Bucket {
  return value === "urgent" || value === "this_week" || value === "fyi";
}

function isScoreBreakdown(value: unknown): value is ScoreBreakdown {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.senderImportance === "number" &&
    typeof v.deadlineProximity === "number" &&
    typeof v.actionRequired === "number"
  );
}

function isTriageResponse(value: unknown): value is TriageResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.threads)) return false;
  return v.threads.every((t) => {
    if (typeof t !== "object" || t === null) return false;
    const th = t as Record<string, unknown>;
    return (
      typeof th.threadId === "string" &&
      typeof th.subject === "string" &&
      Array.isArray(th.emailIds) &&
      th.emailIds.every((id) => typeof id === "string") &&
      typeof th.priorityScore === "number" &&
      isBucket(th.bucket) &&
      isScoreBreakdown(th.scoreBreakdown) &&
      typeof th.summary === "string"
    );
  });
}

function isExtractionResponse(value: unknown): value is ExtractionResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.extractions)) return false;
  return v.extractions.every((e) => {
    if (typeof e !== "object" || e === null) return false;
    const ex = e as Record<string, unknown>;
    return (
      typeof ex.threadId === "string" &&
      Array.isArray(ex.tasks) &&
      ex.tasks.every((t) => {
        if (typeof t !== "object" || t === null) return false;
        const task = t as Record<string, unknown>;
        return (
          typeof task.description === "string" &&
          (task.deadline === null || typeof task.deadline === "string")
        );
      })
    );
  });
}

async function loadInbox(): Promise<Email[]> {
  const filePath = path.join(process.cwd(), "data", "mock-inbox.json");
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

function buildOutput(
  threads: TriageThread[],
  extractions: ThreadExtraction[],
  mode: "ai" | "fallback"
): ProcessInboxResponse {
  const tasksByThreadId = new Map<string, ExtractedTask[]>();
  for (const extraction of extractions) {
    tasksByThreadId.set(extraction.threadId, extraction.tasks);
  }

  const outputThreads: OutputThread[] = threads.map((thread) => ({
    ...thread,
    tasks: tasksByThreadId.get(thread.threadId) ?? [],
  }));

  const timeline: TimelineItem[] = outputThreads.flatMap((thread) =>
    thread.tasks.map((task) => ({
      threadId: thread.threadId,
      subject: thread.subject,
      description: task.description,
      deadline: task.deadline,
    }))
  );

  return { threads: outputThreads, timeline, mode };
}

type FallbackThread = {
  threadId: string;
  subject: string;
  emailIds: string[];
  priorityScore: number;
  bucket: string;
  scoreBreakdown: ScoreBreakdown;
  deadlines: ExtractedTask[];
  summary: string;
};

async function runFallback(emails: Email[]): Promise<ProcessInboxResponse> {
  const result = processInbox(emails) as { threads: FallbackThread[] };
  const fallbackThreads = result?.threads ?? [];

  const triageThreads: TriageThread[] = fallbackThreads.map((thread) => ({
    threadId: thread.threadId,
    subject: thread.subject,
    emailIds: thread.emailIds,
    priorityScore: thread.priorityScore,
    bucket: isBucket(thread.bucket) ? thread.bucket : "fyi",
    scoreBreakdown: thread.scoreBreakdown,
    summary: thread.summary,
  }));

  const extractions: ThreadExtraction[] = fallbackThreads.map((thread) => ({
    threadId: thread.threadId,
    tasks: thread.deadlines ?? [],
  }));

  return buildOutput(triageThreads, extractions, "fallback");
}

async function runAi(emails: Email[]): Promise<ProcessInboxResponse> {
  const triagePrompt = `${TRIAGE_PROMPT}\n\nEmails:\n${JSON.stringify(emails)}`;
  const triage = await callGeminiJSON<TriageResponse>(triagePrompt, isTriageResponse);

  // Extraction must reuse triage's own threadIds, so it's fed triage's actual
  // thread groupings (not sent independently) — otherwise the two calls invent
  // unrelated threadId values and tasks can never be matched back to a thread.
  const emailsById = new Map(emails.map((e) => [e.id, e]));
  const threadsWithEmails = triage.threads.map((thread) => ({
    threadId: thread.threadId,
    subject: thread.subject,
    emails: thread.emailIds
      .map((id) => emailsById.get(id))
      .filter((e): e is Email => e !== undefined),
  }));
  const extractionPrompt = `${EXTRACTION_PROMPT}\n\nThreads:\n${JSON.stringify(threadsWithEmails)}`;
  const extraction = await callGeminiJSON<ExtractionResponse>(
    extractionPrompt,
    isExtractionResponse
  );

  return buildOutput(triage.threads, extraction.extractions, "ai");
}

export async function GET(request: NextRequest) {
  const forceFallback =
    request.nextUrl.searchParams.get("fallback") === "true";

  const emails = await loadInbox();

  // This endpoint fires 2 chained Gemini calls per hit, so it's rate-limited
  // tighter than draft-reply. Unlike draft-reply, a rate-limited request here
  // doesn't error out — it just skips straight to the rule-based engine,
  // since this is the core "Process My Inbox" flow and it should never
  // visibly break. Same graceful-degradation principle as an AI failure.
  const { allowed } = checkRateLimit(`process-inbox:${getClientKey(request)}`, {
    maxRequests: 3,
  });

  if (!forceFallback && allowed) {
    try {
      const result = await runAi(emails);
      return NextResponse.json(result);
    } catch (err) {
      console.warn(
        "[process-inbox] Gemini call failed, falling back to rule-based engine:",
        err instanceof Error ? err.message : err
      );
    }
  } else if (!allowed) {
    console.warn(
      "[process-inbox] Rate limit hit, skipping AI and using rule-based engine"
    );
  }

  const result = await runFallback(emails);
  return NextResponse.json(result);
}
