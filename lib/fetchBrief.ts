import type { ProcessInboxResponse } from "@/lib/types";

// Thrown when the Google session is missing or expired; callers send the
// user back to "/" to sign in again.
export class NotSignedInError extends Error {}

// An error whose message is written for the user and can be shown as-is.
export class FriendlyError extends Error {}

export async function fetchBrief(): Promise<ProcessInboxResponse> {
  // Lets the AI judge "due today" in the user's own time zone.
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const res = await fetch(`/api/process-inbox?tz=${encodeURIComponent(tz)}`);
  if (res.status === 401) throw new NotSignedInError();
  if (res.status === 429) {
    const body: { error?: string } = await res.json().catch(() => ({}));
    throw new FriendlyError(body.error || "Too many requests. Wait a minute, then try again.");
  }
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  return res.json();
}
