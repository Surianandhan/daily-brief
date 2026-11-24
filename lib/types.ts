export type Email = {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  timestamp: string;
  body: string;
  // Gmail label IDs, e.g. "IMPORTANT", "STARRED", "CATEGORY_UPDATES".
  labels: string[];
};

// What the landing page needs to list the inbox (no bodies sent to the browser).
export type InboxListItem = Pick<Email, "id" | "from" | "subject" | "timestamp">;

export type Bucket = "urgent" | "this_week" | "fyi";

export type ScoreBreakdown = {
  senderImportance: number;
  deadlineProximity: number;
  actionRequired: number;
};

export type TriageThread = {
  threadId: string;
  subject: string;
  emailIds: string[];
  priorityScore: number;
  bucket: Bucket;
  scoreBreakdown: ScoreBreakdown;
  summary: string;
};

export type ExtractedTask = { description: string; deadline: string | null };

export type OutputThread = TriageThread & { tasks: ExtractedTask[] };

export type TimelineItem = {
  threadId: string;
  subject: string;
  description: string;
  deadline: string | null;
};

export type ProcessInboxResponse = {
  threads: OutputThread[];
  timeline: TimelineItem[];
  mode: "ai" | "fallback";
  // The signed-in Gmail address, used to open threads in the right account.
  account: string;
};
