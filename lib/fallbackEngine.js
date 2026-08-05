/**
 * fallbackEngine.js
 *
 * Deterministic, AI-free email triage engine for the Daily Brief app.
 * Implements: clusterThreads(), scorePriority(), extractDeadlines()
 *
 * Output is schema-compatible with the AI-generated output format so the
 * rest of the app can consume either source identically.
 *
 * NO external APIs. NO network calls. NO Gemini.
 */

"use strict";

// ---------------------------------------------------------------------------
// 1. CONSTANTS & CONFIGURATION
// ---------------------------------------------------------------------------

/**
 * VIP senders (boss / manager / client).
 * Emails from these addresses earn 4 sender-importance points.
 * Add any known VIP addresses here.
 */
const VIP_SENDERS = [
  "marcus.klein@acmecorp.com",
  "sarah.chen@acmecorp.com",
  "linda.torres@acmecorp.com",
];

/**
 * Known colleagues.
 * Emails from these addresses earn 2 sender-importance points.
 */
const COLLEAGUE_SENDERS = [
  "priya.sharma@prodapt.io",
  "james.walker@prodapt.io",
  "devteam@prodapt.io",
  "qa-team@prodapt.io",
  "ops-alerts@prodapt.io",
  "recruiting@prodapt.io",
  "finance@prodapt.io",
  "hr@prodapt.io",
  "you@prodapt.io",
];

/**
 * Newsletter / noise sender patterns (case-insensitive substring match).
 * Emails from senders matching any of these earn 0 sender-importance points.
 */
const NOISE_SENDER_PATTERNS = [
  "noreply",
  "no-reply",
  "newsletter",
  "offers@",
  "unsubscribe",
  "digest",
  "notification",
  "alert@",
  "info@",
  "linkedin.com",
  "producthunt.com",
  "techdigest.io",
  "cloudprovider.com",
];

/**
 * Action keywords that indicate the email requires a reply or action.
 * Each match contributes to the "action required" score.
 */
const ACTION_KEYWORDS = [
  "please",
  "can you",
  "asap",
  "urgent",
  "review",
  "approve",
  "confirm",
  "send",
  "complete",
  "reply",
  "?",
  "sign off",
  "need you",
  "required",
  "action needed",
  "respond",
  "let me know",
];

// ---------------------------------------------------------------------------
// 2. HELPER UTILITIES
// ---------------------------------------------------------------------------

/**
 * Normalise a subject line for clustering comparison.
 *   - Lowercases
 *   - Trims whitespace
 *   - Strips leading "re:", "fwd:", "fw:" prefixes (repeated)
 *
 * @param {string} subject
 * @returns {string}
 */
function normalizeSubject(subject) {
  if (!subject || typeof subject !== "string") return "";
  let s = subject.toLowerCase().trim();
  // Strip repeated re:/fwd:/fw: prefixes
  const prefixPattern = /^(re:|fwd:|fw:)\s*/;
  let prev;
  do {
    prev = s;
    s = s.replace(prefixPattern, "").trim();
  } while (s !== prev);
  return s;
}

/**
 * Compute a simple word-overlap Jaccard similarity between two strings.
 * Returns a value in [0, 1].
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function wordOverlapSimilarity(a, b) {
  const tokenize = (str) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

  const wordsA = new Set(tokenize(a));
  const wordsB = new Set(tokenize(b));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  wordsA.forEach((w) => {
    if (wordsB.has(w)) intersection++;
  });

  const union = wordsA.size + wordsB.size - intersection;
  return intersection / union;
}

/**
 * Determine the sender-importance category for a given email address.
 *
 * @param {string} from - sender email address
 * @returns {"vip"|"colleague"|"noise"|"unknown"}
 */
function classifySender(from) {
  if (!from) return "unknown";
  const lower = from.toLowerCase();

  // Noise first (newsletters, no-reply, etc.)
  for (const pattern of NOISE_SENDER_PATTERNS) {
    if (lower.includes(pattern)) return "noise";
  }

  if (VIP_SENDERS.some((v) => lower === v.toLowerCase())) return "vip";
  if (COLLEAGUE_SENDERS.some((c) => lower === c.toLowerCase()))
    return "colleague";

  return "unknown";
}

/**
 * Generate a stable, slug-style threadId from a normalised subject.
 *
 * @param {string} normalizedSubject
 * @param {number} index - fallback index if subject is empty
 * @returns {string}
 */
function makeThreadId(normalizedSubject, index) {
  const slug = normalizedSubject
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 50);
  return slug ? `thread-${slug}` : `thread-${index}`;
}

// ---------------------------------------------------------------------------
// 3. clusterThreads(emails)
// ---------------------------------------------------------------------------

/**
 * Groups a flat list of emails into threads based on subject similarity.
 *
 * Algorithm:
 *   1. Normalise every email's subject (strip re:/fwd: prefixes, lowercase).
 *   2. Use greedy clustering: for each email, find an existing cluster whose
 *      canonical (first) normalised subject has a Jaccard word-overlap score
 *      >= SIMILARITY_THRESHOLD with this email's normalised subject.
 *   3. If a match is found, add the email to that cluster.
 *   4. If no match is found, start a new cluster with this email as the seed.
 *
 * @param {Array<{id:string, from:string, subject:string, timestamp:string, body:string}>} emails
 * @returns {Array<Thread>}   Thread shape defined below
 */
function clusterThreads(emails) {
  if (!Array.isArray(emails) || emails.length === 0) return [];

  const SIMILARITY_THRESHOLD = 0.4; // tune: lower = looser grouping

  // Each cluster: { canonicalSubject: string, emails: email[] }
  const clusters = [];

  for (const email of emails) {
    const norm = normalizeSubject(email.subject || "");
    let matched = false;

    for (const cluster of clusters) {
      const sim = wordOverlapSimilarity(norm, cluster.canonicalSubject);
      if (sim >= SIMILARITY_THRESHOLD) {
        cluster.emails.push(email);
        matched = true;
        break;
      }
    }

    if (!matched) {
      clusters.push({ canonicalSubject: norm, emails: [email] });
    }
  }

  // Build Thread objects
  return clusters.map((cluster, idx) => {
    // Sort emails within thread chronologically (oldest first)
    const sorted = [...cluster.emails].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    const threadId = makeThreadId(cluster.canonicalSubject, idx);

    // Use the first (oldest) email's subject as the canonical subject,
    // but capitalise it nicely.
    const canonicalDisplay = sorted[0].subject
      .replace(/^(re:|fwd:|fw:)\s*/i, "")
      .trim();

    return {
      threadId,
      subject: canonicalDisplay,
      emailIds: sorted.map((e) => e.id),
      emails: sorted, // kept for internal use by scorePriority / extractDeadlines
    };
  });
}

// ---------------------------------------------------------------------------
// 4. scorePriority(thread)
// ---------------------------------------------------------------------------

/**
 * Scores the priority of a thread on a 0–10 scale using a deterministic rubric.
 *
 * Rubric
 * ──────
 * Sender importance  (max 4 pts)
 *   VIP / boss / manager / client  → 4
 *   Known colleague                → 2
 *   Unknown / newsletter           → 0
 *
 * Deadline proximity  (max 4 pts)
 *   today / tomorrow / EOD / within 24h → 4
 *   this week                            → 2
 *   no deadline                          → 0
 *
 * Action required  (max 2 pts)
 *   explicit action language / question  → 2
 *   FYI only                             → 0
 *
 * Bucket thresholds
 *   8–10 → "urgent"
 *   4–7  → "this_week"
 *   0–3  → "fyi"
 *
 * @param {Thread} thread - thread object as returned by clusterThreads()
 * @returns {{ priorityScore:number, bucket:string, scoreBreakdown:object }}
 */
function scorePriority(thread) {
  if (!thread || !Array.isArray(thread.emails) || thread.emails.length === 0) {
    return {
      priorityScore: 0,
      bucket: "fyi",
      scoreBreakdown: { senderImportance: 0, deadlineProximity: 0, actionRequired: 0 },
    };
  }

  // ---- 4a. Sender Importance ------------------------------------------------
  // Take the highest-value sender across all emails in the thread.
  let senderImportance = 0;
  for (const email of thread.emails) {
    const cat = classifySender(email.from);
    if (cat === "vip") { senderImportance = 4; break; }       // max, stop early
    if (cat === "colleague" && senderImportance < 2) senderImportance = 2;
    // noise / unknown → 0
  }

  // ---- 4b. Deadline Proximity -----------------------------------------------
  const deadlines = extractDeadlines(thread);
  let deadlineProximity = 0;
  const now = new Date();

  // Check the raw body text for urgency signals (ASAP / urgent / immediately)
  const allBodyText = thread.emails.map((e) => e.body || "").join(" ").toLowerCase();

  // "ASAP" / "urgent" / "immediately" in body → treat as today-level urgency
  if (
    /\basap\b/.test(allBodyText) ||
    /\burgent\b/.test(allBodyText) ||
    /\bimmediately\b/.test(allBodyText) ||
    /\bright now\b/.test(allBodyText)
  ) {
    deadlineProximity = 4;
  } else if (deadlines.length > 0) {
    // Deadline objects extracted by extractDeadlines already filter noise context
    for (const d of deadlines) {
      const dl = d.deadline.toLowerCase();

      // "today" / "EOD" → 4
      if (dl === "today" || dl === "eod" || dl === "end of day") {
        deadlineProximity = 4;
        break;
      }
      // "tomorrow" → 4
      if (dl === "tomorrow") {
        deadlineProximity = 4;
        break;
      }
    }

    // If no immediate deadlines, try absolute date parsing
    if (deadlineProximity === 0) {
      for (const d of deadlines) {
        const parsed = parseDateString(d.deadline);
        if (parsed) {
          const diff = parsed - now;
          if (diff >= 0 && diff <= 48 * 60 * 60 * 1000) {
            deadlineProximity = 4;
            break;
          } else if (diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000) {
            deadlineProximity = Math.max(deadlineProximity, 2);
          }
        }
      }
    }

    // "by <weekday>" / "this week" → at least 2 pts (if not already higher)
    if (deadlineProximity === 0) {
      const hasWeeklyDeadline = deadlines.some((d) => {
        const dl = d.deadline.toLowerCase();
        return dl === "this week" || dl.startsWith("by ");
      });
      if (hasWeeklyDeadline) deadlineProximity = 2;
    }
  }

  // ---- 4c. Action Required --------------------------------------------------
  const allText = thread.emails.map((e) => (e.subject || "") + " " + (e.body || "")).join(" ").toLowerCase();
  let actionRequired = 0;
  for (const kw of ACTION_KEYWORDS) {
    if (allText.includes(kw.toLowerCase())) {
      actionRequired = 2;
      break;
    }
  }

  // ---- Compute final score & bucket -----------------------------------------
  const raw = senderImportance + deadlineProximity + actionRequired;
  const priorityScore = Math.min(10, raw);

  let bucket;
  if (priorityScore >= 8) bucket = "urgent";
  else if (priorityScore >= 4) bucket = "this_week";
  else bucket = "fyi";

  return {
    priorityScore,
    bucket,
    scoreBreakdown: { senderImportance, deadlineProximity, actionRequired },
  };
}

// ---------------------------------------------------------------------------
// 5. extractDeadlines(thread)
// ---------------------------------------------------------------------------

/**
 * Scans all email bodies in the thread for deadline/action-item phrases.
 *
 * Recognises:
 *   - today, tomorrow, EOD, end of day
 *   - by <weekday>  (by Friday, by Monday …)
 *   - explicit dates: MM/DD/YYYY or Month D, YYYY or Month D YYYY
 *   - "due <date>" / "before <date>"
 *
 * Returns an array of { description, deadline } objects.
 * If nothing is found, returns [].
 *
 * @param {Thread} thread
 * @returns {Array<{description:string, deadline:string}>}
 */
function extractDeadlines(thread) {
  if (!thread || !Array.isArray(thread.emails)) return [];

  const results = [];

  // Split text into sentences (rough approximation)
  const splitSentences = (text) =>
    text.split(/(?<=[.!?])\s+|(?:\r?\n)+/).filter((s) => s.trim().length > 0);

  // Deadline intent signals: the sentence must contain one of these words/phrases
  // to be considered a true deadline sentence (avoids noise like "this week in Tech Digest")
  const DEADLINE_INTENT_WORDS = [
    "due", "deadline", "by eod", "by end of day", "by today",
    "by tomorrow", "by friday", "by monday", "by tuesday", "by wednesday",
    "by thursday", "by saturday", "by sunday", "by august", "by september",
    "by october", "by november", "by december", "by january", "by february",
    "by march", "by april", "by may", "by june", "by july",
    "before ", "no later than", "must be", "needs to be",
    "send", "complete", "submit", "confirm", "approve",
    "scheduled for", "expires", "expiry", "deadline", "payment was due",
    "needs finalized", "finalized", "please have", "make sure",
    "need it", "need a", "board at", "call at", "meeting at",
    "review on", "return", "signed", "rsvp by", "reply by",
  ];

  function hasDeadlineIntent(sentence) {
    const lower = sentence.toLowerCase();
    return DEADLINE_INTENT_WORDS.some((w) => lower.includes(w));
  }

  // Deadline detection patterns (order matters: more specific first)
  const patterns = [
    // Explicit dates: August 6, 2026 | August 6 2026
    {
      regex: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi,
      extract: (m) => m[0],
    },
    // Numeric dates: 08/06/2026 | 8-6-2026
    {
      regex: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b/g,
      extract: (m) => m[0],
    },
    // "by <weekday>"
    {
      regex: /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      extract: (m) => "by " + m[1],
    },
    // "by EOD" / "by end of day"
    {
      regex: /\bby\s+(eod|end of day)\b/gi,
      extract: () => "EOD",
    },
    // Standalone "EOD"
    {
      regex: /\beod\b/gi,
      extract: () => "EOD",
    },
    // "end of day"
    {
      regex: /\bend of day\b/gi,
      extract: () => "EOD",
    },
    // "today" — only in deadline-intent sentences
    {
      regex: /\btoday\b/gi,
      extract: () => "today",
      requireIntent: true,
    },
    // "tomorrow" — only in deadline-intent sentences
    {
      regex: /\btomorrow\b/gi,
      extract: () => "tomorrow",
      requireIntent: true,
    },
    // "this week" / "end of week" — only in deadline-intent sentences
    {
      regex: /\b(end of week|by end of week)\b/gi,
      extract: () => "this week",
    },
    {
      regex: /\bby end of week\b/gi,
      extract: () => "this week",
    },
    // "by <date>" / "due <date>" with a year
    {
      regex: /\b(due|before|by)\s+([\w\s,]+?\d{4})\b/gi,
      extract: (m) => m[0],
    },
  ];

  for (const email of thread.emails) {
    const body = email.body || "";
    const sentences = splitSentences(body);

    for (const sentence of sentences) {
      for (const { regex, extract, requireIntent } of patterns) {
        // Skip if this pattern requires deadline-intent context but sentence lacks it
        if (requireIntent && !hasDeadlineIntent(sentence)) continue;

        regex.lastIndex = 0; // reset stateful regex
        let match;
        while ((match = regex.exec(sentence)) !== null) {
          const deadline = extract(match);
          const description = sentence.trim();

          // Deduplicate: skip if we already captured an identical entry
          const isDuplicate = results.some(
            (r) =>
              r.deadline === deadline &&
              r.description === description
          );

          if (!isDuplicate) {
            results.push({ description, deadline });
          }
        }
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// 6. parseDateString (internal helper for scorePriority)
// ---------------------------------------------------------------------------

/**
 * Attempt to parse a deadline string into a JS Date.
 * Returns null if parsing fails.
 *
 * @param {string} dateStr
 * @returns {Date|null}
 */
function parseDateString(dateStr) {
  if (!dateStr) return null;
  const lower = dateStr.toLowerCase().trim();

  const now = new Date();

  if (lower === "today" || lower === "eod") {
    const d = new Date(now);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  if (lower === "tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  const weekdays = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const byDayMatch = lower.match(/^by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (byDayMatch) {
    const targetDay = weekdays.indexOf(byDayMatch[1]);
    const d = new Date(now);
    const currentDay = d.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    d.setDate(d.getDate() + daysUntil);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  // Try native Date parsing for everything else (handles "August 6, 2026", "08/06/2026" etc.)
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
}

// ---------------------------------------------------------------------------
// 7. generateSummary (deterministic, no AI)
// ---------------------------------------------------------------------------

/**
 * Generate a simple deterministic summary for a thread.
 * Picks the most recent email's first two sentences.
 *
 * @param {Thread} thread
 * @returns {string}
 */
function generateSummary(thread) {
  if (!thread.emails || thread.emails.length === 0) return "";

  // Sort newest-first for summary
  const sorted = [...thread.emails].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
  const latestBody = sorted[0].body || "";

  // Extract first 1-2 sentences
  const sentences = latestBody
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0)
    .slice(0, 2);

  const snippet = sentences.join(" ").slice(0, 200);
  const latestSender = sorted[0].from || "unknown";

  return `[${thread.emails.length} email${thread.emails.length > 1 ? "s" : ""}] Latest from ${latestSender}: ${snippet}${snippet.length >= 200 ? "…" : ""}`;
}

// ---------------------------------------------------------------------------
// 8. PUBLIC API: processInbox(emails)
// ---------------------------------------------------------------------------

/**
 * Main entry point.
 * Runs the full pipeline and returns the final output object,
 * schema-compatible with the AI output format.
 *
 * @param {Array} emails - raw email array from mock-inbox.json (or live data)
 * @returns {{ threads: Array }}
 */
function processInbox(emails) {
  const threads = clusterThreads(emails);

  const processedThreads = threads.map((thread) => {
    const { priorityScore, bucket, scoreBreakdown } = scorePriority(thread);
    const deadlines = extractDeadlines(thread);
    const summary = generateSummary(thread);

    return {
      threadId: thread.threadId,
      subject: thread.subject,
      emailIds: thread.emailIds,
      priorityScore,
      bucket,
      scoreBreakdown,
      deadlines,   // bonus field — not in spec but useful
      summary,
    };
  });

  // Sort threads by priority score descending
  processedThreads.sort((a, b) => b.priorityScore - a.priorityScore);

  return { threads: processedThreads };
}

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------

module.exports = {
  clusterThreads,
  scorePriority,
  extractDeadlines,
  processInbox,
  // Exposed for testing
  _internals: { normalizeSubject, wordOverlapSimilarity, classifySender, parseDateString },
};
