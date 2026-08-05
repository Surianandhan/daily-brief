"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import mockInbox from "@/data/mock-inbox.json";
import { useBrief } from "@/lib/BriefContext";
import ReasoningTrace from "@/components/ReasoningTrace";
import type { ProcessInboxResponse } from "@/lib/types";

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

export default function Home() {
  const router = useRouter();
  const { setData } = useBrief();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcessInbox = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/process-inbox");
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const result: ProcessInboxResponse = await res.json();
      setData(result);
      router.push("/daily-brief");
    } catch {
      setError("Couldn't process your inbox. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Daily Brief</h1>
        <p className="text-zinc-500">
          {mockInbox.length} messages waiting. Let AI cluster, prioritize,
          and summarize your inbox.
        </p>
      </header>

      <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {mockInbox.map((email) => (
          <li key={email.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex items-baseline justify-between gap-4">
              <span className="truncate font-medium">{email.from}</span>
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

      <div className="flex flex-col items-start gap-3">
        <button
          onClick={handleProcessInbox}
          disabled={loading}
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
