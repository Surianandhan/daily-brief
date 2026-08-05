"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  RotateCcw,
  Check,
  Loader2,
  Terminal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
} from "lucide-react";

export interface TraceStep {
  id: string;
  label: string;
  subLabel: string;
  durationMs: number;
  logs: string[];
}

export interface ReasoningTraceProps {
  isFallbackMode?: boolean;
  onTraceComplete?: () => void;
  onModeToggle?: () => void;
  steps?: TraceStep[];
}

const DEFAULT_LLM_STEPS: TraceStep[] = [
  {
    id: "step-1",
    label: "Reading unread inbox items...",
    subLabel: "Ingested 38 emails via M365 & Google Workspace API",
    durationMs: 700,
    logs: [
      "[SYS] Connected to Microsoft Graph API endpoint v1.0",
      "[SYS] Fetched 38 unread messages across 4 inbox folders",
      "[PARSE] Sanitized HTML bodies and extracted raw text tokens"
    ]
  },
  {
    id: "step-2",
    label: "Clustering into 9 context threads...",
    subLabel: "Embedding similarity group size: ~4.2 msgs/thread",
    durationMs: 950,
    logs: [
      "[EMBED] Vectorizing message text using OpenAI text-embedding-3-small",
      "[CLUSTER] HDBSCAN grouped 38 emails into 9 distinct semantic clusters",
      "[LINK] Discovered 3 multi-party email chains regarding Q3 Budget Deficit"
    ]
  },
  {
    id: "step-3",
    label: "Extracting temporal constraints...",
    subLabel: "Identified 3 imminent deadlines & 2 scheduled calendar conflicts",
    durationMs: 850,
    logs: [
      "[NER] Extracted entities: 'Today 5 PM', 'EOD Friday', 'Immediate SLA'",
      "[TIME] Normalized relative timestamps to local timezone (UTC+05:30)",
      "[ALERT] Flagged 1 overdue security incident response SLA"
    ]
  },
  {
    id: "step-4",
    label: "Scoring priority & impact...",
    subLabel: "Weighted scoring: Sender VIP rank (40%) + Urgency (35%) + Impact (25%)",
    durationMs: 900,
    logs: [
      "[SCORE] Thread #101 (Server Outage) -> Score 98/100 (HIGH)",
      "[SCORE] Thread #102 (Q3 Contract Review) -> Score 92/100 (HIGH)",
      "[SCORE] Thread #104 (Vendor Invoice) -> Score 68/100 (MEDIUM)",
      "[SCORE] Thread #107 (Weekly Newsletter) -> Score 18/100 (LOW)"
    ]
  },
  {
    id: "step-5",
    label: "Drafting autonomous responses & action matrix...",
    subLabel: "Prepared 2 high-priority auto-replies & assigned triage badges",
    durationMs: 700,
    logs: [
      "[GEN] Generated draft reply for CTO: 'Incident response engaged'",
      "[MATRIX] Created 4 action items in Executive Action Queue",
      "[DONE] Execution pipeline complete"
    ]
  }
];

const DEFAULT_FALLBACK_STEPS: TraceStep[] = [
  {
    id: "step-fb-1",
    label: "Initializing Rule-Based Engine (Fallback Mode)...",
    subLabel: "Primary LLM API offline/throttled — active fallback mechanism",
    durationMs: 500,
    logs: [
      "[WARN] LLM API timeout detected (HTTP 504 / RateLimit)",
      "[SYS] Activating local regex & domain heuristic parser v2.4",
      "[RULE] Loaded 42 deterministic regex patterns"
    ]
  },
  {
    id: "step-fb-2",
    label: "Parsing keyword & sender domain reputation...",
    subLabel: "Scanning subject lines for 'URGENT', 'CRITICAL', 'OUTAGE', 'INVOICE'",
    durationMs: 600,
    logs: [
      "[REGEX] Matched 'CRITICAL' in 2 email subject lines",
      "[DOMAIN] Sender domain @enterprise.com matched VIP list (+30 pts)",
      "[HEURISTIC] Flagged keywords: 'SLA Breach', 'Payment Due'"
    ]
  },
  {
    id: "step-fb-3",
    label: "Applying deterministic priority matrix...",
    subLabel: "Rule fallback complete: 2 High, 4 Medium, 3 Low",
    durationMs: 450,
    logs: [
      "[ASSIGN] Assigned priority bands based on threshold rules",
      "[TAG] Applied badge: '⚡ Rule-based triage'",
      "[DONE] Fallback pipeline executed in 1.55s"
    ]
  }
];

export function ReasoningTrace({
  isFallbackMode = false,
  onTraceComplete,
  onModeToggle,
  steps: customSteps,
}: ReasoningTraceProps) {
  const steps = customSteps || (isFallbackMode ? DEFAULT_FALLBACK_STEPS : DEFAULT_LLM_STEPS);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRunning) {
      const startTime = Date.now() - elapsedMs;
      interval = setInterval(() => {
        setElapsedMs(Date.now() - startTime);
      }, 30);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning, elapsedMs]);

  useEffect(() => {
    if (!isRunning || isCompleted) return;

    const currentStep = steps[currentStepIndex];
    if (!currentStep) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- defensive guard for an empty `steps` array; unreachable with the default step lists
      setIsRunning(false);
      setIsCompleted(true);
      if (onTraceComplete) onTraceComplete();
      return;
    }

    const duration = Math.max(150, currentStep.durationMs / speedMultiplier);

    const timer = setTimeout(() => {
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        setIsRunning(false);
        setIsCompleted(true);
        if (onTraceComplete) onTraceComplete();
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [isRunning, currentStepIndex, speedMultiplier, steps, isCompleted, onTraceComplete]);

  const handleStart = () => {
    setCurrentStepIndex(0);
    setElapsedMs(0);
    setIsCompleted(false);
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentStepIndex(0);
    setElapsedMs(0);
    setIsCompleted(false);
  };

  const toggleLogExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const totalDurationMs = steps.reduce((acc, curr) => acc + curr.durationMs, 0);
  const totalSteps = steps.length;
  const progressPercent = isCompleted
    ? 100
    : isRunning
    ? Math.round(((currentStepIndex + 0.5) / totalSteps) * 100)
    : 0;

  return (
    <div className="w-full bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-6 relative overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="space-y-1">
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-indigo-600">
            {"// Real-Time Execution Trace Engine"}
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Live Execution Trace</h2>
            <span
              className={`text-xs font-mono font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${
                isFallbackMode
                  ? "bg-amber-100 border-amber-300 text-amber-950"
                  : "bg-emerald-100 border-emerald-300 text-emerald-950"
              }`}
            >
              {isFallbackMode ? "⚡ Fallback Mode" : "⚡ Primary Engine"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {onModeToggle && (
            <button
              onClick={onModeToggle}
              className="px-4 py-2 rounded-2xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-all cursor-pointer flex items-center gap-2"
            >
              {isFallbackMode ? <Zap className="h-4 w-4 text-amber-600" /> : <Sparkles className="h-4 w-4 text-indigo-600" />}
              <span>{isFallbackMode ? "Switch Engine" : "Switch Fallback"}</span>
            </button>
          )}

          <div className="flex items-center rounded-2xl bg-slate-100 p-1">
            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                onClick={() => setSpeedMultiplier(speed)}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-black transition-all cursor-pointer ${
                  speedMultiplier === speed
                    ? "bg-slate-900 text-white shadow-md"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          <button
            onClick={handleStart}
            disabled={isRunning}
            className="px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-slate-900 hover:bg-indigo-600 text-white shadow-xl transition-all flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Tracing...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>{isCompleted ? "Re-Run Trace" : "Run Live Trace"}</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="p-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar & Clock */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-black text-slate-900 uppercase tracking-wider">Completion: {progressPercent}%</span>
          <span className="text-slate-700 font-bold">
            {(elapsedMs / 1000).toFixed(2)}s / {(totalDurationMs / (1000 * speedMultiplier)).toFixed(2)}s
          </span>
        </div>
        <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden p-0.5">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step Reveal Items */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const isDone = isCompleted || (isRunning && idx < currentStepIndex);
          const isCurrent = isRunning && idx === currentStepIndex;
          const isExpanded = expandedLogId === step.id;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isCurrent
                  ? "border-indigo-500 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20"
                  : isDone
                  ? "border-slate-200 bg-white text-slate-900 shadow-2xs"
                  : "border-slate-100 bg-slate-50/60 text-slate-400"
              }`}
            >
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    {isDone ? (
                      <div className="h-8 w-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                        <Check className="h-4 w-4 stroke-[3]" />
                      </div>
                    ) : isCurrent ? (
                      <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-500 flex items-center justify-center text-indigo-700">
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full border border-slate-300 bg-white flex items-center justify-center text-slate-500 text-xs font-mono font-black">
                        {idx + 1}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4
                      className={`text-sm sm:text-base font-extrabold tracking-tight ${
                        isCurrent ? "text-indigo-950" : isDone ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">{step.subLabel}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-slate-400">{step.durationMs}ms</span>
                  <button
                    onClick={() => toggleLogExpand(step.id)}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-800 cursor-pointer flex items-center gap-1 text-xs font-mono font-bold"
                  >
                    <Terminal className="h-4 w-4" />
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="bg-slate-900 border-t border-slate-800 p-5 font-mono text-xs text-emerald-400 space-y-2"
                  >
                    {step.logs.map((log, lIdx) => (
                      <div key={lIdx}>{log}</div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default ReasoningTrace;
