// Reads the signed-in user's Gmail (read-only) and turns messages into the
// app's `Email` shape. Plain REST calls: no Google SDK needed.

import type { Email } from "@/lib/types";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

// What counts as "your inbox" for the brief: recent mail, minus the tabs that
// are almost never actionable. Uses Gmail's own search syntax.
export const INBOX_QUERY =
  "in:inbox newer_than:7d -category:promotions -category:social";
export const MAX_EMAILS = 30;
// Keeps the Gemini prompt small and fast; the start of an email carries the ask.
const MAX_BODY_CHARS = 1500;

// The access token is expired, revoked, or lacks Gmail permission.
export class GmailAuthError extends Error {}

type GmailHeader = { name: string; value: string };
type GmailPart = {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { data?: string };
  parts?: GmailPart[];
};
type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailPart;
};

async function gmailGet<T>(
  accessToken: string,
  path: string,
  params: URLSearchParams
): Promise<T> {
  const res = await fetch(`${GMAIL_API}${path}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (res.ok) return (await res.json()) as T;

  const detail = await res.text();
  if (res.status === 401 || (res.status === 403 && /insufficient/i.test(detail))) {
    throw new GmailAuthError(`Gmail API ${res.status}`);
  }
  // e.g. 403 "Gmail API has not been used in project ..." means it isn't enabled.
  throw new Error(`Gmail API ${res.status}: ${detail.slice(0, 300)}`);
}

function decodeEntities(text: string): string {
  const named: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
  };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#")) {
      const isHex = entity[1].toLowerCase() === "x";
      const code = parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(code) && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|div|tr|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

// Drops quoted earlier replies and signatures-of-forwarded-mail so the AI
// sees what this message actually adds, then trims it.
export function cleanBody(text: string): string {
  const kept: string[] = [];
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.replace(/[ \t ]+/g, " ").trim();
    if (/wrote:$/i.test(line)) {
      // "On Mon, 3 Nov 2026 ... <x@y.com> wrote:" — sometimes wrapped onto 2 lines.
      if (/^On /i.test(line)) break;
      if (/^On /i.test(kept[kept.length - 1] ?? "")) {
        kept.pop();
        break;
      }
    }
    if (/^-{2,} ?(Original Message|Forwarded message) ?-{2,}$/i.test(line)) break;
    if (line.startsWith(">")) continue;
    kept.push(line);
  }
  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_BODY_CHARS);
}

function findPart(part: GmailPart | undefined, mimeType: string): GmailPart | undefined {
  if (!part) return undefined;
  if (part.mimeType === mimeType && part.body?.data && !part.filename) return part;
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return undefined;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

function extractBody(message: GmailMessage): string {
  const plain = findPart(message.payload, "text/plain");
  if (plain?.body?.data) return cleanBody(decodeBase64Url(plain.body.data));
  const html = findPart(message.payload, "text/html");
  if (html?.body?.data) return cleanBody(htmlToText(decodeBase64Url(html.body.data)));
  return decodeEntities(message.snippet ?? "");
}

export function toEmail(message: GmailMessage, withBody: boolean): Email {
  const headers = message.payload?.headers ?? [];
  const header = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
  const millis = Number(message.internalDate);
  return {
    id: message.id,
    threadId: message.threadId,
    from: header("From"),
    subject: header("Subject") || "(no subject)",
    timestamp: new Date(Number.isFinite(millis) ? millis : Date.now()).toISOString(),
    labels: message.labelIds ?? [],
    body: withBody ? extractBody(message) : "",
  };
}

/**
 * The most recent inbox messages (see INBOX_QUERY), newest first.
 * `bodies: false` only fetches headers, for quickly listing the inbox.
 */
export async function listInbox(
  accessToken: string,
  { bodies }: { bodies: boolean }
): Promise<Email[]> {
  const list = await gmailGet<{ messages?: { id: string }[] }>(
    accessToken,
    "/messages",
    new URLSearchParams({ q: INBOX_QUERY, maxResults: String(MAX_EMAILS) })
  );

  const params = bodies
    ? new URLSearchParams({ format: "full" })
    : new URLSearchParams([
        ["format", "metadata"],
        ["metadataHeaders", "From"],
        ["metadataHeaders", "Subject"],
      ]);

  const messages = await Promise.all(
    (list.messages ?? []).map((m) =>
      gmailGet<GmailMessage>(accessToken, `/messages/${m.id}`, params)
    )
  );
  return messages.map((m) => toEmail(m, bodies));
}

/** Every message in one Gmail thread, oldest first. */
export async function getThreadEmails(
  accessToken: string,
  threadId: string
): Promise<Email[]> {
  if (!/^[0-9a-f]+$/i.test(threadId)) throw new Error("Invalid thread id");
  const thread = await gmailGet<{ messages?: GmailMessage[] }>(
    accessToken,
    `/threads/${threadId}`,
    new URLSearchParams({ format: "full" })
  );
  return (thread.messages ?? []).map((m) => toEmail(m, true));
}
