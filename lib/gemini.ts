import { GoogleGenerativeAI } from "@google/generative-ai";

// Tried in order. On the free tier a busy model answers 503 ("high demand"),
// so if one fails we move on to the next instead of giving up. The "-latest"
// aliases always point at Google's newest Flash-Lite / Flash release, so they
// keep working as models are retired. Override with a comma-separated
// GEMINI_MODELS env var without changing code.
const MODELS = (
  process.env.GEMINI_MODELS ||
  "gemini-flash-lite-latest,gemini-3.1-flash-lite,gemini-flash-latest"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
// 3 models x 15s + short pauses stays inside the routes' 60s maxDuration.
const CALL_TIMEOUT_MS = 15_000;
const PAUSE_BETWEEN_ATTEMPTS_MS = 1_000;

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

async function callOnce(modelName: string, prompt: string): Promise<unknown> {
  const model = getClient().getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await model.generateContent(prompt, {
    timeout: CALL_TIMEOUT_MS,
  });
  const text = result.response.text();
  return JSON.parse(stripCodeFences(text));
}

/**
 * Calls Gemini with the given prompt, expecting a JSON response that passes
 * `validate`. On a timeout, overload, network error, bad JSON or failed
 * validation it tries the next model in MODELS, and throws only when all
 * of them have failed.
 */
export async function callGeminiJSON<T>(
  prompt: string,
  validate: (value: unknown) => value is T
): Promise<T> {
  let lastError: unknown;
  for (const [index, modelName] of MODELS.entries()) {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_ATTEMPTS_MS));
    }
    try {
      const parsed = await callOnce(modelName, prompt);
      if (validate(parsed)) {
        return parsed;
      }
      lastError = new Error("Response did not match expected schema");
    } catch (err) {
      lastError = err;
    }
    console.warn(
      `[gemini] ${modelName} (attempt ${index + 1}/${MODELS.length}) failed:`,
      lastError instanceof Error ? lastError.message : lastError
    );
  }
  throw new Error("All Gemini models failed", { cause: lastError });
}
