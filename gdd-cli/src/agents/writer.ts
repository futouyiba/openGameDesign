import { Session } from '../core/session.js';
import { AIClient } from '../utils/ai.js';
import { WebSearchClient } from '../utils/search.js';
import { ReferenceManager } from '../storage/references.js';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface Section {
  title: string;
  content: string;
}

export class WriterAgent {
  private session: Session;
  private ai: AIClient;
  private search: WebSearchClient;
  private references: ReferenceManager;
  private outputPath: string;
  private sections: Section[] = [];
  private conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];

  constructor(session: Session, ai: AIClient, enableSearch: boolean = false) {
    this.session = session;
    this.ai = ai;
    this.search = new WebSearchClient();
    this.references = new ReferenceManager(process.cwd());
    this.outputPath = join(process.cwd(), 'game-design-document.md');
  }

  async start() {
    console.log('\n=== 写作阶段 ===\n');

    const state = this.session.getState();
    if (!state.interviewSummary) {
      console.log('未找到访谈总结。跳过写作阶段。');
      return;
    }

    await this.references.init();

    // 生成文档大纲
    await this.generateOutline();

    // 逐节撰写
    for (let i = 0; i < this.sections.length; i++) {
      console.log(`\n[${i + 1}/${this.sections.length}] 正在撰写: ${this.sections[i].title}`);

      // 每轮开始前检查Mail
      await this.checkAndProcessMails();

      // 撰写当前章节
      await this.writeSection(i);

      // 保存当前进度
      await this.saveDocument();
    }

    console.log(`\n✓ 文档撰写完成: ${this.outputPath}\n`);
  }

  private async generateOutline() {
    const state = this.session.getState();
    const systemPrompt = `你是游戏策划文档专家。根据访谈总结，生成文档大纲。

输出JSON数组，每项包含：
- title: 章节标题
- content: 空字符串（稍后填充）

典型章节：游戏概述、核心玩法、系统设计、美术风格、技术实现、开发计划等。`;

    const userPrompt = `访谈总结：
理解: ${state.interviewSummary!.understanding}

关键决策:
${Object.entries(state.interviewSummary!.keyDecisions).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

写作方向: ${state.interviewSummary!.writingDirection}

生成文档大纲。`;

    const response = await this.ai.chat([
      { role: 'user', content: userPrompt }
    ], systemPrompt);

    this.sections = JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
    console.log(`\n生成大纲 (${this.sections.length}个章节):`);
    this.sections.forEach((s, i) => console.log(`  ${i + 1}. ${s.title}`));
  }

  private async writeSection(index: number) {
    const section = this.sections[index];
    const state = this.session.getState();

    const systemPrompt = `你是游戏策划文档撰写专家。撰写指定章节的内容。使用中文Markdown格式。

在适当位置使用Mermaid图表：
- 系统架构: flowchart/graph
- 游戏流程: flowchart
- 状态转换: stateDiagram
- 时间线: gantt

保持内容专业、简洁、可执行。`;

    const contextPrompt = `访谈总结：
理解: ${state.interviewSummary!.understanding}
关键决策: ${JSON.stringify(state.interviewSummary!.keyDecisions)}
写作方向: ${state.interviewSummary!.writingDirection}

已完成章节:
${this.sections.slice(0, index).map(s => `- ${s.title}`).join('\n') || '无'}

当前章节: ${section.title}

撰写该章节的详细内容。`;

    this.conversationHistory.push({ role: 'user', content: contextPrompt });
    const response = await this.ai.chat(this.conversationHistory, systemPrompt);
    this.conversationHistory.push({ role: 'assistant', content: response });

    this.sections[index].content = response;
  }

  private async checkAndProcessMails() {
    // 检查紧急邮件
    const urgentMails = this.session.mailSystem.getUnprocessedMails(['urgent']);
    if (urgentMails.length > 0) {
      console.log(`\n⚠ 发现 ${urgentMails.length} 封紧急邮件:`);
      for (const mail of urgentMails) {
        console.log(`  - [${mail.type}] ${mail.content}`);

        if (mail.type === 'command' && mail.content.includes('停止')) {
          console.log('\n收到停止命令，终止写作。');
          await this.session.mailSystem.markProcessed(mail.id);
          process.exit(0);
        }

        await this.session.mailSystem.markProcessed(mail.id);
      }
    }

    // 检查普通邮件（自主判断是否处理）
    const normalMails = this.session.mailSystem.getUnprocessedMails(['normal']);
    if (normalMails.length > 0) {
      console.log(`\n📧 发现 ${normalMails.length} 封普通邮件，正在评估...`);

      for (const mail of normalMails) {
        if (mail.type === 'opinion') {
          console.log(`  - 采纳意见: ${mail.content}`);
          // 将意见加入对话历史，影响后续写作
          this.conversationHistory.push({
            role: 'user',
            content: `用户意见: ${mail.content}`
          });
        } else if (mail.type === 'comment' && mail.comments) {
          // 处理Comment - 修改特定段落
          await this.processComments(mail);
        }

        await this.session.mailSystem.markProcessed(mail.id);
      }
    }
  }

  private async processComments(mail: any) {
    if (!mail.comments || mail.comments.length === 0) return;

    console.log(`  - 处理 ${mail.comments.length} 条批注`);

    for (const comment of mail.comments) {
      // 找到对应章节
      const sectionIndex = this.sections.findIndex(s =>
        s.content.includes(comment.range.file) || s.title.includes(comment.range.file)
      );

      if (sectionIndex >= 0) {
        console.log(`    修改章节: ${this.sections[sectionIndex].title}`);

        const systemPrompt = `你是游戏策划文档专家。根据用户批注修改指定内容。保持风格一致。`;
        const userPrompt = `原内容:
${this.sections[sectionIndex].content}

用户批注: ${comment.content}

修改该部分内容。`;

        const response = await this.ai.chat([
          { role: 'user', content: userPrompt }
        ], systemPrompt);

        this.sections[sectionIndex].content = response;
      }
    }
  }

  private async saveDocument() {
    const document = this.sections
      .map(s => `## ${s.title}\n\n${s.content}`)
      .join('\n\n');

    // 添加参考资料章节
    const referencesSection = this.references.formatReferencesSection(this.outputPath);

    await writeFile(this.outputPath, `# 游戏策划文档\n\n${document}${referencesSection}`);
    await this.session.setCurrentDocument(this.outputPath);
    await this.references.save();
  }

  // 搜索相关资料（可选功能）
  private async searchReferences(topic: string): Promise<string> {
    try {
      const results = await this.search.search(topic, 2);

      if (results.length === 0) {
        return '';
      }

      console.log(`  📚 找到 ${results.length} 条参考资料`);

      let context = '\n\n参考资料:\n';
      for (const result of results) {
        context += `- ${result.title}: ${result.snippet}\n`;

        // 记录引用
        this.references.addReference(this.outputPath, {
          title: result.title,
          url: result.url,
          content: result.snippet
        });
      }

      return context;
    } catch (error) {
      console.log('  ⚠ 搜索失败，继续写作');
      return '';
    }
  }
}
