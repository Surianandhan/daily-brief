import { getSession } from "@/lib/auth";
import {
  GMAIL_RATE_LIMIT_MESSAGE,
  GmailAuthError,
  GmailRateLimitError,
  listInbox,
} from "@/lib/gmail";
import type { InboxListItem } from "@/lib/types";
import SignIn from "@/components/SignIn";
import InboxView from "@/components/InboxView";

const ERRORS: Record<string, string> = {
  denied: "Google sign-in was cancelled.",
  scope:
    "Daily Brief needs permission to read your Gmail. Please sign in again and tick the Gmail box.",
  state: "Sign-in didn't complete. Please try again.",
  token: "Sign-in failed. Please try again.",
  expired: "Your Google session expired. Please sign in again.",
};

export default async function Home({ searchParams }: PageProps<"/">) {
  const { error } = await searchParams;
  const errorMessage = typeof error === "string" ? ERRORS[error] : undefined;

  const session = await getSession();
  if (!session) return <SignIn error={errorMessage} />;

  let emails: InboxListItem[];
  try {
    emails = (await listInbox(session.accessToken, { bodies: false })).map(
      ({ id, from, subject, timestamp }) => ({ id, from, subject, timestamp })
    );
  } catch (err) {
    if (err instanceof GmailAuthError) return <SignIn error={ERRORS.expired} />;
    if (err instanceof GmailRateLimitError) {
      return (
        <InboxView account={session.email} emails={[]} notice={GMAIL_RATE_LIMIT_MESSAGE} />
      );
    }
    console.error(
      "[home] Gmail read failed:",
      err instanceof Error ? err.message : err
    );
    return <SignIn error="Couldn't read your Gmail inbox. Please try again." />;
  }

  return <InboxView account={session.email} emails={emails} />;
}
