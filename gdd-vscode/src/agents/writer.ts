import { Session } from '../core/session';
import { AIClient } from '../utils/ai';
import * as vscode from 'vscode';
import * as path from 'path';

interface Section {
  title: string;
  content: string;
}

export class WriterAgent {
  private session: Session;
  private ai: AIClient;
  private outputPath: string;
  private sections: Section[] = [];

  constructor(session: Session, ai: AIClient) {
    this.session = session;
    this.ai = ai;
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
    this.outputPath = path.join(workspaceRoot, 'game-design-document.md');
  }

  async start(): Promise<void> {
    const state = this.session.getState();
    if (!state.interviewSummary) {
      vscode.window.showErrorMessage('未找到访谈总结');
      return;
    }

    // 生成大纲
    await this.generateOutline();

    // 逐章节撰写
    for (let i = 0; i < this.sections.length; i++) {
      vscode.window.showInformationMessage(`正在撰写: ${this.sections[i].title} (${i + 1}/${this.sections.length})`);
      await this.writeSection(i);
      await this.saveDocument();
    }

    vscode.window.showInformationMessage('文档撰写完成！');
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

    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(this.outputPath),
      Buffer.from(content)
    );

    await this.session.setCurrentDocument(this.outputPath);
  }
}
