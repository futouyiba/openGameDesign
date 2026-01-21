export type LlmTransport = 'openai-compatible' | 'anthropic' | 'codex';

export type LlmAuthKind = 'apiKey' | 'codex-oauth';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface ChatResult {
  text: string;
}

export interface LlmSelection {
  providerId: string;
  modelId: string;
}

export interface ProviderDefinition {
  id: string;
  label: string;
  transport: LlmTransport;
  auth: LlmAuthKind;
  endpoint?: string;
  baseUrl?: string;
}

export interface ModelChoice {
  id: string;
  label: string;
  description?: string;
  detail?: string;
  providerId: string;
  modelId?: string;
  requiresModelId?: boolean;
  default?: boolean;
}
