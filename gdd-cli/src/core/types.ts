export interface Mail {
  id: string;
  type: 'command' | 'opinion' | 'comment';
  priority: 'urgent' | 'normal' | 'low';
  content: string;
  comments?: Comment[];
  timestamp: Date;
  processed: boolean;
}

export interface Comment {
  range: { file: string; start: number; end: number };
  content: string;
}

export interface ReviewResult {
  inline: InlineAnnotation[];
  summary: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface InlineAnnotation {
  file: string;
  line: number;
  type: 'logic' | 'consistency' | 'practice' | 'feasibility';
  message: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface InterviewSummary {
  understanding: string;
  keyDecisions: Record<string, string>;
  writingDirection: string;
}

export interface DocumentMetadata {
  file: string;
  summary: string;
  lastModified: Date;
}

export interface SessionState {
  phase: 'interview' | 'writing' | 'reviewing';
  currentDocument?: string;
  interviewSummary?: InterviewSummary;
}
