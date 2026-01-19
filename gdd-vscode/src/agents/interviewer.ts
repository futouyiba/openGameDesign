import { Session } from '../core/session';
import { AIClient } from '../utils/ai';
import { InterviewSummary } from '../core/types';
import { parseJSON } from '../utils/json';

export class InterviewerAgent {
  private session: Session;
  private ai: AIClient;
  private conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];

  constructor(session: Session, ai: AIClient) {
    this.session = session;
    this.ai = ai;
  }

  async chat(userMessage: string): Promise<string> {
    this.conversationHistory.push({ role: 'user', content: userMessage });

    const systemPrompt = `你是一位专业的游戏策划访谈专家。你的目标是通过深入的提问来充分理解用户的游戏设计文档需求。建设性地挑战他们的想法，帮助他们思考得更深入。每次只问一个问题。保持简洁直接。使用中文交流。`;

    const response = await this.ai.chat(this.conversationHistory, systemPrompt);
    this.conversationHistory.push({ role: 'assistant', content: response });

    return response;
  }

  async generateSummary(): Promise<InterviewSummary> {
    const summaryPrompt = `基于访谈对话，生成结构化的总结，包括：
1. understanding: 用户想要创建什么
2. keyDecisions: 访谈中做出的重要决策（对象格式）
3. writingDirection: 写作阶段的明确方向

以JSON格式输出，使用中文。`;

    this.conversationHistory.push({ role: 'user', content: summaryPrompt });
    const summaryResponse = await this.ai.chat(this.conversationHistory, '你是文档摘要专家。');

    const summary: InterviewSummary = parseJSON(summaryResponse);
    await this.session.setInterviewSummary(summary);

    return summary;
  }
}
