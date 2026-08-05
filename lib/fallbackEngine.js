// Fallback triage engine — used when the Gemini API call fails, times out,
// doesn't parse, or the caller passes ?fallback=true.
// Owner: Person 1. These are STUBS ONLY — no implementation yet.

/**
 * Group emails into threads by normalized subject line
 * (e.g. strip "Re:", "Fwd:", extra whitespace, then compare).
 *
 * @param {Array<{id: string, from: string, subject: string, timestamp: string, body: string}>} emails
 * @returns {Array<{threadId: string, subject: string, emailIds: string[]}>}
 */
function clusterThreads(emails) {
  // TODO(Person 1): normalize subject lines and group matching emails into threads.
}

/**
 * Score a thread's priority 0-10 and bucket it.
 * - Sender importance 0-4: VIP = 4, colleague = 2, unknown = 0
 * - Deadline proximity 0-4: today = 4, this week = 2, none = 0
 * - Action-required 0-2: explicit ask = 2, FYI = 0
 * Bucket: urgent 8-10, this_week 4-7, fyi 0-3.
 *
 * @param {{threadId: string, subject: string, emailIds: string[]}} thread
 * @returns {{priorityScore: number, bucket: "urgent"|"this_week"|"fyi", scoreBreakdown: {senderImportance: number, deadlineProximity: number, actionRequired: number}}}
 */
function scorePriority(thread) {
  // TODO(Person 1): implement scoring rubric above.
}

/**
 * Extract deadlines/action items mentioned in a thread's email bodies via regex.
 * Do not invent dates — if no deadline is stated explicitly, return null for it.
 *
 * @param {{threadId: string, emailIds: string[]}} thread
 * @returns {Array<{description: string, deadline: string|null}>}
 */
function extractDeadlines(thread) {
  // TODO(Person 1): regex-match deadline phrases (e.g. "by Friday", "EOD", "due 8/10").
}

module.exports = { clusterThreads, scorePriority, extractDeadlines };
