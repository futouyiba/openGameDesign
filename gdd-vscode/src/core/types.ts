export interface Mail {
  id: string;
  type: 'command' | 'opinion' | 'comment';
  priority: 'urgent' | 'normal' | 'low';
  status: 'draft' | 'sent' | 'read' | 'processed';
  from: 'user' | 'agent';
  content: string;
  comments?: Comment[];
  timestamp: Date;
}

export interface Comment {
  range: {
    file: string;
    startLine: number;
    endLine: number;
    text?: string;
  };
  content: string;
  resolved: boolean;
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
  outputDir?: string;
  conversationHistory?: Array<{ role: 'ai' | 'user'; content: string }>;
}
