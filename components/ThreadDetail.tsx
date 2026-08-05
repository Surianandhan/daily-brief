"use client";

import { useState } from "react";
import PriorityBadge, { FallbackBadge } from "@/components/PriorityBadge";
import ReasoningTrace from "@/components/ReasoningTrace";
import DraftResponse from "@/components/DraftResponse";
import type { OutputThread } from "@/lib/types";

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "No deadline stated";
  return deadline;
}

export interface ThreadDetailProps {
  thread?: OutputThread;
  mode?: "ai" | "fallback";
  onClose?: () => void;
}

export default function ThreadDetail({ thread, mode, onClose }: ThreadDetailProps) {
  const [activeTab, setActiveTab] = useState<"detail" | "trace" | "reply">("reply");

  if (!thread) {
    return (
      <div className="p-8 text-center text-zinc-500 font-mono text-xs">
        No thread selected.
      </div>
    );
  }

  const isFallback = mode === "fallback";
  const tasks = thread.tasks;
  const scoreBreakdown = thread.scoreBreakdown;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div
        className="flex h-full w-full max-w-2xl flex-col gap-5 overflow-y-auto bg-white p-6 sm:p-8 shadow-2xl dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <PriorityBadge priority={thread.bucket} score={thread.priorityScore} size="sm" />
              <FallbackBadge isFallback={isFallback} size="sm" />
            </div>
            <h2 className="text-xl font-bold leading-tight text-zinc-900 dark:text-zinc-100">
              {thread.subject}
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tab Controls */}
        <div className="flex items-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 p-1.5 gap-1.5 w-fit">
          <button
            onClick={() => setActiveTab("reply")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "reply"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            ✍️ AI Draft Reply
          </button>

          <button
            onClick={() => setActiveTab("detail")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "detail"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            📄 Summary & Tasks
          </button>

          <button
            onClick={() => setActiveTab("trace")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "trace"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            ⚡ Execution Trace
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "reply" && (
          <DraftResponse thread={thread} />
        )}

        {activeTab === "detail" && (
          <div className="space-y-6">
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">
                Summary
              </h3>
              <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                {thread.summary || "No summary available."}
              </p>
            </section>

            {tasks.length > 0 && (
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">
                  Extracted Tasks &amp; Deadlines
                </h3>
                <ul className="flex flex-col gap-2">
                  {tasks.map((task, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-800/40"
                    >
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{task.description}</p>
                      <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                        Deadline: {formatDeadline(task.deadline)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">
                Priority Score Breakdown
              </h3>
              <ul className="text-xs font-mono text-zinc-600 dark:text-zinc-400 space-y-1">
                <li>• Sender importance: {scoreBreakdown.senderImportance}/4</li>
                <li>• Deadline proximity: {scoreBreakdown.deadlineProximity}/4</li>
                <li>• Action required: {scoreBreakdown.actionRequired}/2</li>
              </ul>
            </section>
          </div>
        )}

        {activeTab === "trace" && <ReasoningTrace isFallbackMode={isFallback} />}
      </div>
    </div>
  );
}
