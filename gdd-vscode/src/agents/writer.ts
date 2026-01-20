import { Session } from '../core/session';
import { AIClient } from '../utils/ai';
import { UnderwaterDocManager } from '../storage/underwater';
import * as vscode from 'vscode';
import * as path from 'path';

interface Section {
  title: string;
  content: string;
}

let globalProgressProvider: any = null;

export function setProgressProvider(provider: any) {
  globalProgressProvider = provider;
}

export class WriterAgent {
  private session: Session;
  private ai: AIClient;
  private underwater: UnderwaterDocManager;
  private outputPath: string;
  private sections: Section[] = [];

  constructor(session: Session, ai: AIClient) {
    this.session = session;
    this.ai = ai;
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    const state = session.getState();
    const outputDir = state.outputDir || 'docs';
    this.outputPath = path.join(workspaceRoot, outputDir, 'game-design-document.md');
    this.underwater = new UnderwaterDocManager(this.outputPath);
  }

  async start(): Promise<void> {
    const state = this.session.getState();
    if (!state.interviewSummary) {
      vscode.window.showErrorMessage('未找到访谈总结');
      return;
    }

    vscode.window.showInformationMessage('开始生成文档大纲...');
    await this.generateOutline();

    // 更新 Progress 显示章节
    if (globalProgressProvider) {
      globalProgressProvider.updateSections(
        this.sections.map(s => ({ title: s.title, status: 'pending' }))
      );
    }

    for (let i = 0; i < this.sections.length; i++) {
      // 更新当前章节状态
      if (globalProgressProvider) {
        const sections = this.sections.map((s, idx) => ({
          title: s.title,
          status: idx < i ? 'completed' : idx === i ? 'in_progress' : 'pending'
        }));
        globalProgressProvider.updateSections(sections);
      }

      vscode.window.showInformationMessage(`正在撰写: ${this.sections[i].title} (${i + 1}/${this.sections.length})`);
      await this.writeSection(i);
      await this.saveDocument();
    }

    // 全部完成
    if (globalProgressProvider) {
      globalProgressProvider.updateSections(
        this.sections.map(s => ({ title: s.title, status: 'completed' }))
      );
    }

    // Generate underwater doc
    await this.underwater.load();
    await this.generateUnderwaterDoc();
    await this.underwater.save();

    vscode.window.showInformationMessage('文档撰写完成！水下文档已生成。');
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

    const response = await this.ai.chat([{ role: 'user', content: userPrompt }], systemPrompt);
    this.sections = JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
  }

  private async writeSection(index: number) {
    const section = this.sections[index];
    const state = this.session.getState();

    const systemPrompt = `你是游戏策划文档撰写专家。撰写指定章节的内容。使用中文Markdown格式。

在适当位置使用Mermaid图表：
- 系统架构: flowchart/graph
- 游戏流程: flowchart
- 状态转换: stateDiagram

保持内容专业、简洁、可执行。`;

    const contextPrompt = `访谈总结：
理解: ${state.interviewSummary!.understanding}
关键决策: ${JSON.stringify(state.interviewSummary!.keyDecisions)}
写作方向: ${state.interviewSummary!.writingDirection}

当前章节: ${section.title}

撰写该章节的详细内容。`;

    const response = await this.ai.chat([{ role: 'user', content: contextPrompt }], systemPrompt);
    this.sections[index].content = response;
  }

  private async saveDocument() {
    const document = this.sections
      .map(s => `## ${s.title}\n\n${s.content}`)
      .join('\n\n');

    const content = `# 游戏策划文档\n\n${document}`;

    // 确保输出目录存在
    const outputDir = require('path').dirname(this.outputPath);
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(outputDir));

    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(this.outputPath),
      Buffer.from(content)
    );

    await this.session.setCurrentDocument(this.outputPath);
  }

  private async generateUnderwaterDoc() {
    const state = this.session.getState();
    const systemPrompt = `你是游戏策划专家。分析访谈总结，提取水下文档信息。

输出JSON格式：
{
  "context": ["背景信息", "约束条件"],
  "alternatives": [{"option": "方案A", "rejectionReason": "原因"}],
  "tradeoffs": ["权衡"],
  "risks": ["风险"],
  "openQuestions": ["待解决问题"]
}`;

    const userPrompt = `访谈总结：
${JSON.stringify(state.interviewSummary, null, 2)}

提取水下文档信息。`;

    const response = await this.ai.chat([{ role: 'user', content: userPrompt }], systemPrompt);
    const data = JSON.parse(response.replace(/```json\n?|\n?```/g, ''));

    Object.entries(state.interviewSummary!.keyDecisions).forEach(([key, value]) => {
      this.underwater.addDecision(key, value as string);
    });

    data.context?.forEach((c: string) => this.underwater.addContext(c));
    data.alternatives?.forEach((a: any) => this.underwater.addAlternative(a.option, a.rejectionReason));
    data.tradeoffs?.forEach((t: string) => this.underwater.addTradeoff(t));
    data.risks?.forEach((r: string) => this.underwater.addRisk(r));
    data.openQuestions?.forEach((q: string) => this.underwater.addOpenQuestion(q));
  }
}
