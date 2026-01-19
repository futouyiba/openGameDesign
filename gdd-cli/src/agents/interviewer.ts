import { Session } from '../core/session.js';
import { AIClient } from '../utils/ai.js';
import { InterviewSummary } from '../core/types.js';
import { parseJSON } from '../utils/json.js';
import inquirer from 'inquirer';

export class InterviewerAgent {
  private session: Session;
  private ai: AIClient;
  private conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];

  constructor(session: Session, ai: AIClient) {
    this.session = session;
    this.ai = ai;
  }

  async start() {
    if (!process.stdin.isTTY) {
      console.log('Non-interactive mode detected. Skipping interview phase.');
      return;
    }

    console.log('\n=== Interview Phase ===\n');
    console.log('I will ask you questions to understand your game design document needs.');
    console.log('Type "done" when you are ready to start writing.\n');

    const systemPrompt = `你是一位专业的游戏策划访谈专家。你的目标是通过深入的提问来充分理解用户的游戏设计文档需求。建设性地挑战他们的想法，帮助他们思考得更深入。每次只问一个问题。保持简洁直接。使用中文交流。`;

    this.conversationHistory.push({
      role: 'user',
      content: '我想创建一份游戏策划文档。请开始访谈。'
    });

    try {
      while (true) {
        const aiResponse = await this.ai.chat(this.conversationHistory, systemPrompt);
        console.log(`\nInterviewer: ${aiResponse}\n`);
        this.conversationHistory.push({ role: 'assistant', content: aiResponse });

        const { answer } = await inquirer.prompt([{
          type: 'input',
          name: 'answer',
          message: 'You:'
        }]);

        if (answer.toLowerCase() === 'done') {
          break;
        }

        this.conversationHistory.push({ role: 'user', content: answer });
      }

      await this.generateSummary();
    } catch (error) {
      if ((error as any).code === 'ERR_USE_AFTER_CLOSE') {
        console.log('\nInterview interrupted.');
      } else {
        throw error;
      }
    }
  }

  private async generateSummary() {
    const summaryPrompt = `基于访谈对话，生成结构化的总结，包括：
1. understanding: 用户想要创建什么
2. keyDecisions: 访谈中做出的重要决策（对象格式）
3. writingDirection: 写作阶段的明确方向

以JSON格式输出，使用中文。`;

    const summaryResponse = await this.ai.chat([
      ...this.conversationHistory,
      { role: 'user', content: summaryPrompt }
    ]);

    const summary: InterviewSummary = parseJSON(summaryResponse);
    await this.session.setInterviewSummary(summary);

    console.log('\n=== 访谈总结 ===');
    console.log(`理解: ${summary.understanding}`);
    console.log(`\n关键决策:`);
    Object.entries(summary.keyDecisions).forEach(([k, v]) => console.log(`  - ${k}: ${v}`));
    console.log(`\n写作方向: ${summary.writingDirection}\n`);
  }
}
