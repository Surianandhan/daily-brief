"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBrief } from "@/lib/BriefContext";
import { NotSignedInError, fetchBrief } from "@/lib/fetchBrief";
import ReasoningTrace from "@/components/ReasoningTrace";
import type { InboxListItem } from "@/lib/types";

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// "Jane Doe <jane@x.com>" -> "Jane Doe"
function displayName(from: string): string {
  const name = from.replace(/<[^>]*>/, "").replace(/"/g, "").trim();
  return name || from;
}

export default function InboxView({
  emails,
  account,
}: {
  emails: InboxListItem[];
  account: string;
}) {
  const router = useRouter();
  const { setData } = useBrief();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcessInbox = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchBrief());
      router.push("/daily-brief");
    } catch (err) {
      if (err instanceof NotSignedInError) {
        // The API already cleared the expired session; re-render "/" to sign in.
        router.replace("/?error=expired");
        router.refresh();
        return;
      }
      setError("Couldn't process your inbox. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Daily Brief</h1>
          <form action="/api/auth/logout" method="post" className="flex items-center gap-3 text-sm text-zinc-500">
            <span className="truncate">{account}</span>
            <button type="submit" className="rounded-full border border-zinc-300 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Sign out
            </button>
          </form>
        </div>
        <p className="text-zinc-500">
          {emails.length === 0
            ? "No inbox emails from the last 7 days (Promotions and Social are skipped)."
            : `${emails.length} recent inbox emails. Let AI cluster, prioritise and summarise them.`}
        </p>
      </header>

      {emails.length > 0 && (
        <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {emails.map((email) => (
            <li key={email.id} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="truncate font-medium">{displayName(email.from)}</span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {formatTimestamp(email.timestamp)}
                </span>
              </div>
              <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                {email.subject}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col items-start gap-3">
        <button
          onClick={handleProcessInbox}
          disabled={loading || emails.length === 0}
          className="rounded-full bg-zinc-950 px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {loading ? "Processing..." : "Process My Inbox"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <ReasoningTrace />}
      </div>
    </div>
  );
}
