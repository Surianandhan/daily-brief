"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Copy,
  Check,
  RefreshCw,
  Wand2,
  Edit3,
  ThumbsUp,
} from "lucide-react";
import confetti from "canvas-confetti";
import type { OutputThread } from "@/lib/types";

export interface DraftResponseProps {
  thread?: OutputThread;
  onSendReply?: (replyText: string) => void;
}

const TONE_SUGGESTIONS = [
  { id: "sug-1", label: "✅ Approve & Proceed", tone: "professional and decisive, approving the request" },
  { id: "sug-2", label: "⏳ Request Extension", tone: "polite, asking for more time before committing" },
  { id: "sug-3", label: "🚨 Urgent Escalation", tone: "urgent and high-priority, escalating for immediate attention" },
  { id: "sug-4", label: "💬 Acknowledge Receipt", tone: "brief, professional-friendly acknowledgment" },
];

export function DraftResponse({ thread, onSendReply }: DraftResponseProps) {
  const [draftText, setDraftText] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState(TONE_SUGGESTIONS[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const fetchDraft = async (tone: string) => {
    if (!thread) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/draft-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: thread.subject,
          emails: [{ from: "thread", body: thread.summary || thread.subject }],
          tone,
        }),
      });
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const data: { draft: string } = await res.json();
      setDraftText(data.draft);
    } catch {
      setError("Couldn't generate a draft reply. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => fetchDraft(TONE_SUGGESTIONS[0].tone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.threadId]);

  const handleSelectSuggestion = (sugId: string) => {
    setSelectedSuggestion(sugId);
    const suggestion = TONE_SUGGESTIONS.find((s) => s.id === sugId);
    if (suggestion) fetchDraft(suggestion.tone);
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
      colors: ["#6366f1", "#10b981", "#f59e0b"],
    });
    if (onSendReply) onSendReply(draftText);
    setTimeout(() => setIsSent(false), 3000);
  };

  return (
    <div className="w-full bg-white rounded-[2.5rem] p-7 sm:p-9 border border-slate-200/90 shadow-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="space-y-1">
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-indigo-600">
            {"// Autonomous Response Studio"}
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            Suggested Action & Response Draft
            <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
          </h3>
        </div>

        <span className="text-xs font-mono text-slate-500 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 font-bold">
          {thread?.emailIds?.length ?? 0} email{thread?.emailIds?.length === 1 ? "" : "s"} in thread
        </span>
      </div>

      <div className="space-y-2.5">
        <label className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Wand2 className="h-3.5 w-3.5 text-indigo-600" />
          Quick AI Response Suggestions:
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TONE_SUGGESTIONS.map((sug) => {
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
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 relative">
        <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
          <span className="flex items-center gap-1.5 font-bold text-slate-700">
            <Edit3 className="h-3.5 w-3.5 text-indigo-600" />
            Response Draft (Editable):
          </span>
          <span>{draftText.length} characters</span>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 focus-within:border-indigo-500 focus-within:bg-white transition-all shadow-2xs">
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/80 backdrop-blur-xs z-10 flex items-center justify-center gap-2 text-xs font-mono text-indigo-600 font-bold"
              >
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Drafting tailored response...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={5}
            className="w-full p-4 text-xs font-mono text-slate-800 bg-transparent focus:outline-none resize-none leading-relaxed"
            placeholder="Draft reply content..."
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          onClick={() => {
            const suggestion = TONE_SUGGESTIONS.find((s) => s.id === selectedSuggestion);
            if (suggestion) fetchDraft(suggestion.tone);
          }}
          disabled={isGenerating}
          className="px-4 py-2 rounded-2xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
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
