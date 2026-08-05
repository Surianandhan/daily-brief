export type Email = {
  id: string;
  from: string;
  subject: string;
  timestamp: string;
  body: string;
};

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
};
