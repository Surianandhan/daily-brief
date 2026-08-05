"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Copy,
  Check,
  RefreshCw,
  MessageSquare,
  Wand2,
  Edit3,
  ThumbsUp
} from "lucide-react";
import confetti from "canvas-confetti";

export interface DraftResponseProps {
  thread?: {
    id: string;
    subject: string;
    sender: string;
    senderEmail?: string;
    company?: string;
    keyTakeaway?: string;
    actionRequired?: string;
  };
  onSendReply?: (replyText: string) => void;
}

const DEFAULT_SUGGESTIONS = [
  { id: "sug-1", label: "✅ Approve & Proceed", tone: "Professional & Decisive" },
  { id: "sug-2", label: "⏳ Request SLA Extension", font: "Defer & Request Details" },
  { id: "sug-3", label: "🚨 Urgent Escalation", tone: "High Priority Alert" },
  { id: "sug-4", label: "💬 Acknowledge Receipt", tone: "Quick Confirmation" },
];

export function DraftResponse({ thread, onSendReply }: DraftResponseProps) {
  const senderName = thread?.sender || "Elena Rostova";

  const getInitialDraft = () => {
    if (thread?.subject.includes("Database") || thread?.subject.includes("CRITICAL")) {
      return `Hi ${senderName},

I have reviewed the latency metrics and SLA breach report. Please proceed immediately with triggering the hot-standby failover to prod-us-east-2. Keep the SecOps team updated throughout the maintenance window.

Best regards,
[Your Name]`;
    }

    if (thread?.subject.includes("Contract") || thread?.subject.includes("Renewal")) {
      return `Hi ${senderName},

Thank you for sending over the Q3 Enterprise Agreement ($420k ARR). I have reviewed the indemnification limits in Section 8.4 and approved the final terms. 

Attached is the countersigned agreement.

Best regards,
[Your Name]`;
    }

    return `Hi ${senderName},

Thank you for reaching out regarding "${thread?.subject || "your update"}". I have reviewed the details and approved the recommended action.

Best regards,
[Your Name]`;
  };

  const [draftText, setDraftText] = useState(getInitialDraft());
  const [selectedSuggestion, setSelectedSuggestion] = useState(DEFAULT_SUGGESTIONS[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSelectSuggestion = (sugId: string) => {
    setSelectedSuggestion(sugId);
    setIsGenerating(true);

    setTimeout(() => {
      if (sugId === "sug-1") {
        setDraftText(`Hi ${senderName},\n\nI have reviewed the proposed terms and approve proceeding immediately as outlined in your message.\n\nBest regards,\n[Your Name]`);
      } else if (sugId === "sug-2") {
        setDraftText(`Hi ${senderName},\n\nThank you for bringing this to my attention. Could we schedule a 15-minute call today to clarify the deadline constraints before proceeding?\n\nBest regards,\n[Your Name]`);
      } else if (sugId === "sug-3") {
        setDraftText(`Hi ${senderName},\n\nThis has been marked as CRITICAL / HIGH PRIORITY. I have escalated this directly to our executive engineering lead for immediate SLA response.\n\nBest regards,\n[Your Name]`);
      } else {
        setDraftText(`Hi ${senderName},\n\nThanks for sending this over! Message received and noted.\n\nBest,\n[Your Name]`);
      }
      setIsGenerating(false);
    }, 400);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draftText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSend = () => {
    setIsSent(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ["#6366f1", "#10b981", "#f59e0b"]
    });
    if (onSendReply) onSendReply(draftText);
    setTimeout(() => setIsSent(false), 3000);
  };

  return (
    <div className="w-full bg-white rounded-[2.5rem] p-7 sm:p-9 border border-slate-200/90 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="space-y-1">
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-indigo-600">
            // Autonomous Response Studio
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            Suggested Action & Response Draft
            <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
          </h3>
        </div>

        <span className="text-xs font-mono text-slate-500 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 font-bold">
          Recipient: {thread?.senderEmail || `${senderName.toLowerCase().replace(" ", ".")}@corp.net`}
        </span>
      </div>

      {/* AI Suggestion Chips */}
      <div className="space-y-2.5">
        <label className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Wand2 className="h-3.5 w-3.5 text-indigo-600" />
          Quick AI Response Suggestions:
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DEFAULT_SUGGESTIONS.map((sug) => {
            const isSelected = selectedSuggestion === sug.id;
            return (
              <button
                key={sug.id}
                onClick={() => handleSelectSuggestion(sug.id)}
                className={`p-3 rounded-2xl border text-xs font-bold text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-[1.02]"
                    : "border-slate-200 bg-slate-50 text-slate-800 hover:border-indigo-300 hover:bg-white"
                }`}
              >
                <span>{sug.label}</span>
                <span className={`text-[10px] font-mono mt-1 ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                  {sug.tone}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Response Draft Textarea Box */}
      <div className="space-y-2 relative">
        <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
          <span className="flex items-center gap-1.5 font-bold text-slate-700">
            <Edit3 className="h-3.5 w-3.5 text-indigo-600" />
            Suitable Response Draft (Editable):
          </span>
          <span>{draftText.length} characters</span>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 focus-within:border-indigo-500 focus-within:bg-white transition-all shadow-2xs">
          {isGenerating && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs z-10 flex items-center justify-center gap-2 text-xs font-mono text-indigo-600 font-bold">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Drafting tailored response...</span>
            </div>
          )}

          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={5}
            className="w-full p-4 text-xs font-mono text-slate-800 bg-transparent focus:outline-none resize-none leading-relaxed"
            placeholder="Draft reply content..."
          />
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          onClick={() => handleSelectSuggestion(selectedSuggestion)}
          className="px-4 py-2 rounded-2xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer flex items-center gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
          <span>Regenerate Draft</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-2xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-all cursor-pointer flex items-center gap-2"
          >
            {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-600" />}
            <span>{isCopied ? "Copied!" : "Copy Reply"}</span>
          </button>

          <button
            onClick={handleSend}
            disabled={isSent}
            className="px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-slate-900 hover:bg-indigo-600 text-white shadow-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSent ? (
              <>
                <ThumbsUp className="h-4 w-4 text-emerald-400" />
                <span>Response Sent!</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Send Response</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DraftResponse;
