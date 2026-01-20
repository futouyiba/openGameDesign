import { Session } from '../core/session.js';
import { AIClient } from '../utils/ai.js';
import { InterviewSummary } from '../core/types.js';
import { parseJSON } from '../utils/json.js';
import { UnderwaterDocManager } from '../storage/underwater.js';
import inquirer from 'inquirer';
import { join } from 'path';

export class InterviewerAgent {
  private session: Session;
  private ai: AIClient;
  private conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];
  private underwater: UnderwaterDocManager;

  constructor(session: Session, ai: AIClient) {
    this.session = session;
    this.ai = ai;
    const docPath = join(process.cwd(), 'game-design-document.md');
    this.underwater = new UnderwaterDocManager(docPath);
  }

  async start() {
    if (!process.stdin.isTTY) {
      console.log('Non-interactive mode detected. Skipping interview phase.');
      return;
    }

    const savedHistory = this.session.getConversationHistory();

    if (savedHistory.length > 0) {
      console.log('\n=== 恢复之前的访谈 ===\n');
      savedHistory.forEach(msg => {
        if (msg.role === 'assistant') {
          console.log(`Interviewer: ${msg.content}\n`);
        } else {
          console.log(`You: ${msg.content}\n`);
        }
      });
      this.conversationHistory = savedHistory;
    } else {
      console.log('\n=== Interview Phase ===\n');
      console.log('I will ask you questions to understand your game design document needs.');
      console.log('Type "done" when you are ready to start writing.\n');

      this.conversationHistory.push({
        role: 'user',
        content: '我想创建一份游戏策划文档。请开始访谈。'
      });
    }

    const systemPrompt = `你是一位专业的游戏策划访谈专家。你的目标是通过深入的提问来充分理解用户的游戏设计文档需求。建设性地挑战他们的想法，帮助他们思考得更深入。每次只问一个问题。保持简洁直接。使用中文交流。`;

    try {
      while (true) {
        const aiResponse = await this.ai.chat(this.conversationHistory, systemPrompt);
        console.log(`\nInterviewer: ${aiResponse}\n`);
        this.conversationHistory.push({ role: 'assistant', content: aiResponse });
        await this.session.addConversationMessage({ role: 'assistant', content: aiResponse });

        const { answer } = await inquirer.prompt([{
          type: 'input',
          name: 'answer',
          message: 'You:'
        }]);

        if (answer.toLowerCase() === 'done') {
          break;
        }

        this.conversationHistory.push({ role: 'user', content: answer });
        await this.session.addConversationMessage({ role: 'user', content: answer });
      }

      await this.generateSummary();
      await this.extractConversationInsights();
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

  private async extractConversationInsights() {
    const systemPrompt = `分析访谈对话，提取关键洞察。输出JSON：
{
  "context": ["背景/约束"],
  "openQuestions": ["待解决问题"]
}`;

    const userPrompt = `对话历史：
${this.conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n\n')}

提取洞察。`;

    const response = await this.ai.chat([{ role: 'user', content: userPrompt }], systemPrompt);
    const data = parseJSON(response);

    await this.underwater.load();
    data.context?.forEach((c: string) => this.underwater.addContext(c));
    data.openQuestions?.forEach((q: string) => this.underwater.addOpenQuestion(q));
    await this.underwater.save();
  }
}
