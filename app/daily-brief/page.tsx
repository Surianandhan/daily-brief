"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBrief } from "@/lib/BriefContext";
import ThreadDetail from "@/components/ThreadDetail";
import TimelineStrip from "@/components/TimelineStrip";
import PriorityBadge, { FallbackBadge } from "@/components/PriorityBadge";
import type { Bucket, OutputThread, ProcessInboxResponse } from "@/lib/types";

const COLUMNS: { bucket: Bucket; label: string }[] = [
  { bucket: "urgent", label: "Urgent" },
  { bucket: "this_week", label: "This Week" },
  { bucket: "fyi", label: "FYI" },
];

export default function DailyBriefPage() {
  const router = useRouter();
  const { data, setData } = useBrief();
  const [loading, setLoading] = useState(() => !data);
  const [error, setError] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<OutputThread | null>(
    null
  );

  useEffect(() => {
    if (data) return;
    fetch("/api/process-inbox")
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((result: ProcessInboxResponse) => setData(result))
      .catch(() => setError("Couldn't load your Daily Brief."))
      .finally(() => setLoading(false));
  }, [data, setData]);

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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Daily Brief</h1>
        <FallbackBadge isFallback={data.mode === "fallback"} size="sm" />
      </header>

      <TimelineStrip />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {COLUMNS.map(({ bucket, label }) => {
          const threads = data.threads.filter((t) => t.bucket === bucket);
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
          onClose={() => setSelectedThread(null)}
        />
      )}
    </div>
  );
}
