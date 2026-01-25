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

export type DependencyType = 'INHERITANCE' | 'REFERENCE';

export interface Dependency {
  file: string;
  type: DependencyType;
}

export interface DocumentMetadata {
  file: string;
  summary: string;
  dependencies?: string[]; // Legacy/Implied string paths
  explicitDependencies?: Dependency[]; // [NEW] Structured explicit dependencies
  lastModified: Date;
}

export interface ConversationBranch {
  id: string;
  topic: string;
  history: Array<{ role: 'ai' | 'user'; content: string }>;
  parentId: string;
  createdAt: number;
}

export interface SessionState {
  phase: 'interview' | 'writing' | 'reviewing';
  currentDocument?: string;
  interviewSummary?: InterviewSummary;
  outputDir?: string;
  conversationHistory?: Array<{ role: 'ai' | 'user'; content: string }>;
  branches?: Record<string, ConversationBranch>;
  activeBranchId?: string;
  llmSelection?: {
    providerId: string;
    modelId: string;
  };
}

export interface ContextStrategy {
  id: string;
  name: string;
  description: string;
  /**
   * Given a task description and a list of available documents, return the relevant file paths.
   */
  select(task: string, availableDocs: DocumentMetadata[]): Promise<string[]>;
}

export interface ExtensionState {
  isWriterMode?: boolean;
  [key: string]: any;
}
