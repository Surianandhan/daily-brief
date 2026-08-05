import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-2.5-flash-lite";
const CALL_TIMEOUT_MS = 5000;

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  if (!client) {
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

// Gemini sometimes wraps JSON in ```json ... ``` fences despite instructions
// to return only JSON. Strip those before parsing.
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

async function callOnce(prompt: string): Promise<unknown> {
  const model = getClient().getGenerativeModel({ model: MODEL_NAME });
  const result = await model.generateContent(prompt, {
    timeout: CALL_TIMEOUT_MS,
  });
  const text = result.response.text();
  return JSON.parse(stripCodeFences(text));
}

/**
 * Calls Gemini with the given prompt, expecting a JSON response.
 * Retries once on timeout, network error, or JSON parse failure.
 * Optionally validates the parsed JSON against `validate`; a failed
 * validation is also retried once.
 */
export async function callGeminiJSON<T>(
  prompt: string,
  validate: (value: unknown) => value is T
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const parsed = await callOnce(prompt);
      if (validate(parsed)) {
        return parsed;
      }
    } catch {
      // fall through to retry / rethrow below
    }
  }
  throw new Error("Gemini call failed validation or errored after retry");
}
