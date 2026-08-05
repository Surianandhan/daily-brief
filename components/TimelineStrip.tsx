"use client";

import React from "react";
import { Clock, AlertCircle, Calendar, CheckCircle2, Filter } from "lucide-react";

export interface TimelineStripThread {
  deadlineHorizon?: "overdue" | "today" | "this_week" | "flexible";
  priority?: string;
}

export interface TimelineStripProps {
  activeFilter?: string;
  onSelectFilter?: (filterId: string) => void;
  threads?: TimelineStripThread[];
}

export function TimelineStrip({
  activeFilter = "all",
  onSelectFilter,
  threads = [],
}: TimelineStripProps) {
  const counts = {
    all: threads.length || 6,
    overdue: threads.filter((t) => t.deadlineHorizon === "overdue" || t.priority === "urgent" || t.priority === "high").length || 2,
    today: threads.filter((t) => t.deadlineHorizon === "today").length || 2,
    this_week: threads.filter((t) => t.deadlineHorizon === "this_week").length || 1,
    flexible: threads.filter((t) => t.deadlineHorizon === "flexible" || t.priority === "low").length || 1,
  };

  const horizons = [
    {
      id: "all",
      label: "All Items",
      count: counts.all,
      color: "border-slate-200 bg-white text-slate-800 hover:border-indigo-300",
      activeColor: "border-slate-900 bg-slate-900 text-white shadow-xl scale-[1.02]",
      icon: Filter,
    },
    {
      id: "overdue",
      label: "Overdue",
      count: counts.overdue,
      badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
      color: "border-rose-200 bg-rose-50/40 text-rose-900 hover:bg-rose-50/80",
      activeColor: "border-rose-600 bg-rose-600 text-white shadow-xl shadow-rose-200 scale-[1.02]",
      icon: AlertCircle,
    },
    {
      id: "today",
      label: "Due Today",
      count: counts.today,
      badgeColor: "bg-amber-100 text-amber-900 border-amber-200",
      color: "border-amber-200 bg-amber-50/40 text-amber-900 hover:bg-amber-50/80",
      activeColor: "border-amber-600 bg-amber-600 text-white shadow-xl shadow-amber-200 scale-[1.02]",
      icon: Clock,
    },
    {
      id: "this_week",
      label: "This Week",
      count: counts.this_week,
      badgeColor: "bg-indigo-100 text-indigo-900 border-indigo-200",
      color: "border-indigo-200 bg-indigo-50/40 text-indigo-900 hover:bg-indigo-50/80",
      activeColor: "border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-[1.02]",
      icon: Calendar,
    },
    {
      id: "flexible",
      label: "Low Urgency",
      count: counts.flexible,
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
      color: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      activeColor: "border-slate-800 bg-slate-800 text-white shadow-xl scale-[1.02]",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="w-full bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-indigo-600">
            {"// Temporal Horizon Analysis"}
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Deadline Timeline Strip</h3>
        </div>

        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200">
          UTC+05:30
        </span>
      </div>

      {/* Progress Horizon Beam Line */}
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex p-0.5">
        <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${(counts.overdue / (counts.all || 1)) * 100}%` }}></div>
        <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${(counts.today / (counts.all || 1)) * 100}%` }}></div>
        <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${(counts.this_week / (counts.all || 1)) * 100}%` }}></div>
        <div className="bg-slate-300 h-full rounded-full transition-all duration-500" style={{ width: `${(counts.flexible / (counts.all || 1)) * 100}%` }}></div>
      </div>

      {/* Horizon Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {horizons.map((item) => {
          const Icon = item.icon;
          const isActive = activeFilter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectFilter && onSelectFilter(item.id)}
              className={`p-4 sm:p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer flex items-center justify-between ${
                isActive ? item.activeColor : item.color
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
              </div>
              <span
                className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-full border ${
                  isActive ? "bg-white/20 text-white border-white/30" : item.badgeColor
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TimelineStrip;
