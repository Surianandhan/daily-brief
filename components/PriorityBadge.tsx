"use client";

import React from "react";
import { AlertCircle, AlertTriangle, Info, Zap, ShieldCheck } from "lucide-react";

export interface PriorityBadgeProps {
  priority?: "high" | "medium" | "low" | string;
  score?: number;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
}

export function PriorityBadge({
  priority = "medium",
  score,
  size = "md",
  showScore = true,
}: PriorityBadgeProps) {
  const isSm = size === "sm";

  if (priority === "high" || priority === "urgent") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50/90 font-bold text-rose-700 shadow-2xs ${
          isSm ? "px-3 py-1 text-[11px]" : "px-3.5 py-1 text-xs"
        }`}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-600"></span>
        </span>
        <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
        <span className="uppercase tracking-wider">High Priority</span>
        {showScore && score !== undefined && (
          <span className="ml-1 font-mono text-[11px] font-black text-rose-900 bg-rose-200/80 px-1.5 py-0.2 rounded-md">
            {score}
          </span>
        )}
      </span>
    );
  }

  if (priority === "medium" || priority === "this_week") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50/90 font-bold text-amber-900 shadow-2xs ${
          isSm ? "px-3 py-1 text-[11px]" : "px-3.5 py-1 text-xs"
        }`}
      >
        <span className="h-2 w-2 rounded-full bg-amber-500"></span>
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        <span className="uppercase tracking-wider">Medium Priority</span>
        {showScore && score !== undefined && (
          <span className="ml-1 font-mono text-[11px] font-black text-amber-950 bg-amber-200/80 px-1.5 py-0.2 rounded-md">
            {score}
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100/90 font-semibold text-slate-700 shadow-2xs ${
        isSm ? "px-3 py-1 text-[11px]" : "px-3.5 py-1 text-xs"
      }`}
    >
      <span className="h-2 w-2 rounded-full bg-slate-400"></span>
      <Info className="h-3.5 w-3.5 text-slate-500" />
      <span className="uppercase tracking-wider">Low Priority</span>
      {showScore && score !== undefined && (
        <span className="ml-1 font-mono text-[11px] font-bold text-slate-800 bg-slate-200/80 px-1.5 py-0.2 rounded-md">
          {score}
        </span>
      )}
    </span>
  );
}

export function FallbackBadge({ isFallback = false, size = "md" }: { isFallback?: boolean; size?: "sm" | "md" }) {
  const isSm = size === "sm";

  if (isFallback) {
    return (
      <span
        title="Rule-based fallback engine active"
        className={`inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/90 font-bold text-amber-950 shadow-2xs ${
          isSm ? "px-3 py-1 text-[11px]" : "px-3.5 py-1 text-xs"
        }`}
      >
        <Zap className="h-3.5 w-3.5 text-amber-700 animate-pulse" />
        <span className="uppercase tracking-wider">Rule-based triage</span>
        <span className="rounded font-mono text-[10px] uppercase font-black text-amber-950 bg-amber-200 px-1.5 py-0.2">
          Fallback
        </span>
      </span>
    );
  }

  return (
    <span
      title="Primary Engine Active"
      className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50/90 font-bold text-emerald-900 shadow-2xs ${
        isSm ? "px-3 py-1 text-[11px]" : "px-3.5 py-1 text-xs"
      }`}
    >
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
      <span className="uppercase tracking-wider">Primary Engine</span>
      <span className="rounded font-mono text-[10px] uppercase font-black text-emerald-900 bg-emerald-200/80 px-1.5 py-0.2">
        Active
      </span>
    </span>
  );
}

export default PriorityBadge;
