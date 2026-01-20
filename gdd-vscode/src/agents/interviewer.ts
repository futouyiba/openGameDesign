import { Session } from '../core/session';
import { AIClient } from '../utils/ai';
import { InterviewSummary } from '../core/types';
import { UnderwaterDocManager } from '../storage/underwater';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class InterviewerAgent {
  private session: Session;
  private ai: AIClient;
  private conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];
  private systemPrompt: string;
  private underwater: UnderwaterDocManager;

  constructor(session: Session, ai: AIClient) {
    this.session = session;
    this.ai = ai;

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    const state = session.getState();
    const outputDir = state.outputDir || 'docs';
    const docPath = path.join(workspaceRoot, outputDir, 'game-design-document.md');
    this.underwater = new UnderwaterDocManager(docPath);

    // 加载系统提示词
    const promptPath = path.join(__dirname, '../../prompts/interviewer-system.txt');
    this.systemPrompt = fs.existsSync(promptPath)
      ? fs.readFileSync(promptPath, 'utf-8')
      : '你是一位专业的游戏策划访谈专家。通过深入的提问来充分理解用户的游戏设计文档需求。每次只问1-3个问题。保持简洁直接。使用中文交流。';
  }

  async chat(userMessage: string): Promise<string> {
    this.conversationHistory.push({ role: 'user', content: userMessage });

    const response = await this.ai.chat(this.conversationHistory, this.systemPrompt);
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

    const summary: InterviewSummary = JSON.parse(summaryResponse.replace(/```json\n?|\n?```/g, ''));
    await this.session.setInterviewSummary(summary);

    // Extract conversation insights
    await this.extractConversationInsights();

    return summary;
  }

  private async extractConversationInsights() {
    const systemPrompt = `分析访谈对话，提取关键洞察。输出JSON：
{
  "context": ["背景/约束"],
  "openQuestions": ["待解决问题"]
}`;

    const userPrompt = `对话历史：
${this.conversationHistory.slice(0, 20).map(m => `${m.role}: ${m.content}`).join('\n\n')}

提取洞察。`;

    const response = await this.ai.chat([{ role: 'user', content: userPrompt }], systemPrompt);
    const data = JSON.parse(response.replace(/```json\n?|\n?```/g, ''));

    await this.underwater.load();
    data.context?.forEach((c: string) => this.underwater.addContext(c));
    data.openQuestions?.forEach((q: string) => this.underwater.addOpenQuestion(q));
    await this.underwater.save();
  }
}
