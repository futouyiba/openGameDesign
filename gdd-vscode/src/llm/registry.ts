import { ModelChoice, ProviderDefinition } from './types';

export const PROVIDERS: Record<string, ProviderDefinition> = {
  'opencode-zen-openai': {
    id: 'opencode-zen-openai',
    label: 'OpenCode Zen',
    transport: 'openai-compatible',
    auth: 'apiKey',
    baseUrl: 'https://opencode.ai/zen/v1'
  },
  'opencode-zen-anthropic': {
    id: 'opencode-zen-anthropic',
    label: 'OpenCode Zen',
    transport: 'anthropic',
    auth: 'apiKey',
    baseUrl: 'https://opencode.ai/zen/v1'
  },
  'openai-codex': {
    id: 'openai-codex',
    label: 'OpenAI (ChatGPT Plus/Pro)',
    transport: 'codex',
    auth: 'codex-oauth',
    endpoint: 'https://chatgpt.com/backend-api/codex/responses'
  },
  'zai': {
    id: 'zai',
    label: 'Z.AI',
    transport: 'openai-compatible',
    auth: 'apiKey',
    baseUrl: 'https://api.z.ai/api/paas/v4'
  },
  'deepseek': {
    id: 'deepseek',
    label: 'DeepSeek',
    transport: 'openai-compatible',
    auth: 'apiKey',
    baseUrl: 'https://api.deepseek.com/v1'
  },
  'dashscope': {
    id: 'dashscope',
    label: 'DashScope (Qwen)',
    transport: 'openai-compatible',
    auth: 'apiKey',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  },
  'hunyuan': {
    id: 'hunyuan',
    label: 'Tencent Hunyuan',
    transport: 'openai-compatible',
    auth: 'apiKey',
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1'
  },
  'minimax': {
    id: 'minimax',
    label: 'MiniMax',
    transport: 'openai-compatible',
    auth: 'apiKey',
    baseUrl: 'https://api.minimax.io/v1'
  },
  'anthropic-direct': {
    id: 'anthropic-direct',
    label: 'Anthropic (Claude)',
    transport: 'anthropic',
    auth: 'apiKey'
  }
};

export const MODEL_CHOICES: ModelChoice[] = [
  {
    id: 'anthropic-claude-3-5-sonnet',
    label: 'Anthropic / Claude 3.5 Sonnet',
    description: 'claude-3-5-sonnet-20241022',
    detail: 'Direct API',
    providerId: 'anthropic-direct',
    modelId: 'claude-3-5-sonnet-20241022',
    default: true
  },
  {
    id: 'opencode-zen-glm-4.7-free',
    label: 'OpenCode Zen / GLM 4.7 (Free)',
    description: 'glm-4.7-free',
    detail: 'Default - OpenCode Zen free model',
    providerId: 'opencode-zen-openai',
    modelId: 'glm-4.7-free',
    default: true
  },
  {
    id: 'opencode-zen-minimax-m2.1-free',
    label: 'OpenCode Zen / MiniMax M2.1 (Free)',
    description: 'minimax-m2.1-free',
    detail: 'OpenCode Zen free model',
    providerId: 'opencode-zen-anthropic',
    modelId: 'minimax-m2.1-free'
  },
  {
    id: 'openai-codex-gpt-5.2',
    label: 'OpenAI Codex OAuth / GPT 5.2',
    description: 'gpt-5.2',
    detail: 'ChatGPT Plus/Pro OAuth',
    providerId: 'openai-codex',
    modelId: 'gpt-5.2'
  },
  {
    id: 'openai-codex-gpt-5.2-codex',
    label: 'OpenAI Codex OAuth / GPT 5.2 Codex',
    description: 'gpt-5.2-codex',
    detail: 'ChatGPT Plus/Pro OAuth',
    providerId: 'openai-codex',
    modelId: 'gpt-5.2-codex'
  },
  {
    id: 'openai-codex-gpt-5.1-codex-max',
    label: 'OpenAI Codex OAuth / GPT 5.1 Codex Max',
    description: 'gpt-5.1-codex-max',
    detail: 'ChatGPT Plus/Pro OAuth',
    providerId: 'openai-codex',
    modelId: 'gpt-5.1-codex-max'
  },
  {
    id: 'openai-codex-gpt-5.1-codex-mini',
    label: 'OpenAI Codex OAuth / GPT 5.1 Codex Mini',
    description: 'gpt-5.1-codex-mini',
    detail: 'ChatGPT Plus/Pro OAuth',
    providerId: 'openai-codex',
    modelId: 'gpt-5.1-codex-mini'
  },
  {
    id: 'zai-glm-4.7-flash',
    label: 'Z.AI / GLM-4.7-Flash',
    description: 'glm-4.7-flash',
    detail: 'Z.AI free tier',
    providerId: 'zai',
    modelId: 'glm-4.7-flash'
  },
  {
    id: 'deepseek-reasoner',
    label: 'DeepSeek / Reasoner',
    description: 'deepseek-reasoner',
    detail: 'Strong reasoning',
    providerId: 'deepseek',
    modelId: 'deepseek-reasoner'
  },
  {
    id: 'dashscope-custom',
    label: 'DashScope / Qwen (Custom Model)',
    description: 'Enter model id',
    detail: 'Requires DashScope API key',
    providerId: 'dashscope',
    requiresModelId: true
  },
  {
    id: 'hunyuan-custom',
    label: 'Tencent Hunyuan (Custom Model)',
    description: 'Enter model id',
    detail: 'Requires Hunyuan API key',
    providerId: 'hunyuan',
    requiresModelId: true
  },
  {
    id: 'minimax-custom',
    label: 'MiniMax (Custom Model)',
    description: 'Enter model id',
    detail: 'Requires MiniMax API key',
    providerId: 'minimax',
    requiresModelId: true
  }
];

export function getProviderDefinition(providerId: string): ProviderDefinition {
  const provider = PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return provider;
}

export function getDefaultModelChoice(): ModelChoice {
  const choice = MODEL_CHOICES.find(model => model.default);
  if (!choice) {
    throw new Error('Default model choice not configured');
  }
  return choice;
}
