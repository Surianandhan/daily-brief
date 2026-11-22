"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBrief } from "@/lib/BriefContext";
import { NotSignedInError, fetchBrief } from "@/lib/fetchBrief";
import ThreadDetail from "@/components/ThreadDetail";
import TimelineStrip, { type DeadlineHorizon } from "@/components/TimelineStrip";
import PriorityBadge, { FallbackBadge } from "@/components/PriorityBadge";
import type { Bucket, OutputThread } from "@/lib/types";

const COLUMNS: { bucket: Bucket; label: string }[] = [
  { bucket: "urgent", label: "Urgent" },
  { bucket: "this_week", label: "This Week" },
  { bucket: "fyi", label: "FYI" },
];

// Uses the rubric's deadline score: 4 = due within 24h, 2 = within 7 days.
function deadlineHorizon(thread: OutputThread): DeadlineHorizon {
  const proximity = thread.scoreBreakdown.deadlineProximity;
  if (proximity >= 4) return "today";
  if (proximity >= 2) return "this_week";
  return "flexible";
}

export default function DailyBriefPage() {
  const router = useRouter();
  const { data, setData } = useBrief();
  const [loading, setLoading] = useState(() => !data);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [selectedThread, setSelectedThread] = useState<OutputThread | null>(
    null
  );

  useEffect(() => {
    if (data) return;
    fetchBrief()
      .then((result) => setData(result))
      .catch((err) => {
        if (err instanceof NotSignedInError) {
          router.replace("/?error=expired");
          return;
        }
        setError("Couldn't load your Daily Brief.");
      })
      .finally(() => setLoading(false));
  }, [data, setData, router]);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-6 py-16">
        <p className="text-zinc-500">Processing your inbox...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-full bg-zinc-950 px-6 py-3 font-medium text-white dark:bg-white dark:text-zinc-950"
        >
          Back to inbox
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const visibleThreads = data.threads.filter(
    (t) => filter === "all" || deadlineHorizon(t) === filter
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Daily Brief</h1>
        <FallbackBadge isFallback={data.mode === "fallback"} size="sm" />
      </header>

      <TimelineStrip
        threads={data.threads.map((t) => ({ deadlineHorizon: deadlineHorizon(t) }))}
        activeFilter={filter}
        onSelectFilter={setFilter}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {COLUMNS.map(({ bucket, label }) => {
          const threads = visibleThreads.filter((t) => t.bucket === bucket);
          return (
            <section key={bucket} className="flex flex-col gap-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                {label} ({threads.length})
              </h2>
              <div className="flex flex-col gap-3">
                {threads.length === 0 && (
                  <p className="text-sm text-zinc-400">Nothing here.</p>
                )}
                {threads.map((thread) => (
                  <button
                    key={thread.threadId}
                    onClick={() => setSelectedThread(thread)}
                    className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 text-left transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <PriorityBadge
                        priority={thread.bucket}
                        score={thread.priorityScore}
                        size="sm"
                      />
                    </div>
                    <p className="font-medium leading-snug">
                      {thread.subject}
                    </p>
                    <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {thread.summary}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {selectedThread && (
        <ThreadDetail
          thread={selectedThread}
          mode={data.mode}
          account={data.account}
          onClose={() => setSelectedThread(null)}
        />
      )}
    </div>
  );
}
