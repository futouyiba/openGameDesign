import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { ensureApiKey, ensureCodexOAuth } from '../llm/auth';
import { getProviderDefinition } from '../llm/registry';
import { ChatMessage, LlmSelection } from '../llm/types';
import { log } from './logger';

const DEFAULT_MAX_OUTPUT_TOKENS = 4096;

export class AIClient {
  private context: vscode.ExtensionContext;
  private selection: LlmSelection | undefined;
  private openaiClient: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;

  constructor(context: vscode.ExtensionContext, selection?: LlmSelection) {
    this.context = context;
    this.selection = selection;
  }

  updateSelection(selection: LlmSelection | undefined) {
    this.selection = selection;
    this.openaiClient = null;
    this.anthropicClient = null;
  }

  async chat(
    messages: { role: 'user' | 'assistant'; content: string }[],
    systemPrompt?: string,
    retries = 3
  ) {
    for (let i = 0; i < retries; i++) {
      try {
        if (!this.selection) {
          throw new Error('LLM model not selected');
        }
        const provider = getProviderDefinition(this.selection.providerId);

        if (provider.transport === 'anthropic') {
          return await this.callAnthropic(this.selection, messages, systemPrompt, provider.baseUrl);
        }

        if (provider.transport === 'openai-compatible') {
          return await this.callOpenAICompatible(this.selection, messages, systemPrompt, provider.baseUrl);
        }

        if (provider.transport === 'codex') {
          if (!provider.endpoint) {
            throw new Error('Codex endpoint is not configured');
          }
          return await this.callCodex(this.selection, messages, systemPrompt, provider.endpoint);
        }

        throw new Error(`Unsupported provider transport: ${provider.transport}`);
      } catch (error: any) {
        if (shouldRetry(error) && i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
          continue;
        }
        throw error;
      }
    }

    throw new Error('API调用失败');
  }

  private async callAnthropic(
    selection: LlmSelection,
    messages: { role: 'user' | 'assistant'; content: string }[],
    systemPrompt: string | undefined,
    baseUrl?: string
  ): Promise<string> {
    const apiKey = await ensureApiKey(this.context, selection.providerId, '请输入 OpenCode Zen API Key (https://opencode.ai/auth)');

    if (!this.anthropicClient) {
      this.anthropicClient = new Anthropic({
        apiKey,
        baseURL: baseUrl
      });
    }

    const response = await this.anthropicClient.messages.create({
      model: selection.modelId,
      max_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
      system: systemPrompt,
      messages
    });

    return response.content
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('')
      .trim();
  }

  private async callOpenAICompatible(
    selection: LlmSelection,
    messages: { role: 'user' | 'assistant'; content: string }[],
    systemPrompt: string | undefined,
    baseUrl?: string
  ): Promise<string> {
    const provider = getProviderDefinition(selection.providerId);
    const prompt = provider.id.startsWith('opencode-zen')
      ? '请输入 OpenCode Zen API Key (https://opencode.ai/auth)'
      : `请输入 ${provider.label} API Key`;
    const apiKey = await ensureApiKey(this.context, provider.id, prompt);

    if (!this.openaiClient) {
      this.openaiClient = new OpenAI({
        apiKey,
        baseURL: baseUrl
      });
    }

    const openaiMessages: ChatMessage[] = [];
    if (systemPrompt) {
      openaiMessages.push({ role: 'system', content: systemPrompt });
    }
    for (const message of messages) {
      openaiMessages.push({ role: message.role, content: message.content });
    }

    const response = await this.openaiClient.chat.completions.create({
      model: selection.modelId,
      messages: openaiMessages,
      max_tokens: DEFAULT_MAX_OUTPUT_TOKENS
    });

    return response.choices?.[0]?.message?.content?.trim() || '';
  }

  private async callCodex(
    selection: LlmSelection,
    messages: { role: 'user' | 'assistant'; content: string }[],
    systemPrompt: string | undefined,
    endpoint: string
  ): Promise<string> {
    const tokens = await ensureCodexOAuth(this.context);

    const openaiMessages: ChatMessage[] = [];
    if (systemPrompt) {
      openaiMessages.push({ role: 'system', content: systemPrompt });
    }
    for (const message of messages) {
      openaiMessages.push({ role: message.role, content: message.content });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      authorization: `Bearer ${tokens.accessToken}`
    };

    if (tokens.accountId) {
      headers['ChatGPT-Account-Id'] = tokens.accountId;
    }

    log('Calling Codex API', { endpoint, model: selection.modelId });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: selection.modelId,
        messages: openaiMessages,
        max_tokens: DEFAULT_MAX_OUTPUT_TOKENS
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('Codex API error', { status: response.status, body: errorText });
      throw new Error(`Codex request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    log('Codex API success', { response: data });
    return extractResponseText(data);
  }
}

function shouldRetry(error: any): boolean {
  const status = error?.status ?? error?.response?.status;
  return status === 429 || status === 503 || status === 504;
}

function extractResponseText(data: any): string {
  if (!data) {
    return '';
  }

  if (typeof data.output_text === 'string') {
    return data.output_text.trim();
  }

  if (Array.isArray(data.choices) && data.choices[0]?.message?.content) {
    return String(data.choices[0].message.content).trim();
  }

  if (Array.isArray(data.output) && data.output[0]?.content) {
    const content = data.output[0].content;
    if (Array.isArray(content)) {
      return content
        .filter((part: any) => part.type === 'output_text')
        .map((part: any) => part.text)
        .join('')
        .trim();
    }
  }

  return '';
}
