import Anthropic from '@anthropic-ai/sdk';

export class AIClient {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
  }

  async chat(messages: { role: 'user' | 'assistant'; content: string }[], systemPrompt?: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          system: systemPrompt,
          messages
        });

        return response.content[0].type === 'text' ? response.content[0].text : '';
      } catch (error: any) {
        if (error.status === 504 && i < retries - 1) {
          console.log(`\n⚠ API超时，${3 - i}秒后重试... (${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        throw error;
      }
    }
    throw new Error('API调用失败');
  }
}
