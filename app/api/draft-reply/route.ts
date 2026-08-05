import { NextRequest, NextResponse } from "next/server";
import { callGeminiJSON } from "@/lib/gemini";
import { checkRateLimit, getClientKey } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
// Worst case is 1 Gemini call x 2 attempts x 5s timeout = up to 10s, right at
// Vercel's default Hobby-plan function timeout — extend it for headroom.
export const maxDuration = 15;

type DraftReplyRequest = {
  subject: string;
  emails: Array<{ from: string; body: string }>;
  tone?: string;
};

type DraftReplyResponse = { draft: string };

function isDraftReplyResponse(value: unknown): value is DraftReplyResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.draft === "string";
}

const DRAFT_PROMPT_TEMPLATE = `Draft a short reply to this email thread. Tone: {{tone}} (default:
professional-friendly). Keep it under 80 words. Reference specifics
from the thread — don't be generic.
Return ONLY valid JSON: { "draft": "string" }`;

export async function POST(request: NextRequest) {
  const { allowed, retryAfterSeconds } = checkRateLimit(
    `draft-reply:${getClientKey(request)}`
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many draft requests. Please wait a moment and try again." },
      {
        status: 429,
        headers: retryAfterSeconds
          ? { "Retry-After": String(retryAfterSeconds) }
          : undefined,
      }
    );
  }

  const body = (await request.json()) as DraftReplyRequest;
  const tone = body.tone || "professional-friendly";

  const threadText = body.emails
    .map((email) => `From: ${email.from}\n${email.body}`)
    .join("\n\n---\n\n");

  const prompt = `${DRAFT_PROMPT_TEMPLATE.replace(
    "{{tone}}",
    tone
  )}\n\nSubject: ${body.subject}\n\nThread:\n${threadText}`;

  try {
    const result = await callGeminiJSON<DraftReplyResponse>(
      prompt,
      isDraftReplyResponse
    );
    return NextResponse.json(result);
  } catch (err) {
    console.warn(
      "[draft-reply] Gemini call failed:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: "Failed to generate draft reply" },
      { status: 502 }
    );
  }
}
