"use client";

import PriorityBadge from "@/components/PriorityBadge";
import type { OutputThread } from "@/lib/types";

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "No deadline stated";
  return deadline;
}

export default function ThreadDetail({
  thread,
  onClose,
}: {
  thread: OutputThread;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div
        className="flex h-full w-full max-w-md flex-col gap-6 overflow-y-auto bg-white p-6 shadow-xl dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <PriorityBadge />
            <h2 className="text-xl font-semibold leading-tight">
              {thread.subject}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Summary
          </h3>
          <p className="text-sm leading-relaxed">
            {thread.summary || "No summary available."}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Tasks &amp; Deadlines
          </h3>
          {thread.tasks.length === 0 ? (
            <p className="text-sm text-zinc-500">No tasks extracted.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {thread.tasks.map((task, i) => (
                <li
                  key={i}
                  className="rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <p>{task.description}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatDeadline(task.deadline)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Score Breakdown
          </h3>
          <ul className="text-sm text-zinc-600 dark:text-zinc-400">
            <li>Sender importance: {thread.scoreBreakdown.senderImportance}/4</li>
            <li>Deadline proximity: {thread.scoreBreakdown.deadlineProximity}/4</li>
            <li>Action required: {thread.scoreBreakdown.actionRequired}/2</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
