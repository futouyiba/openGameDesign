import { Session } from '../core/session.js';
import { AIClient } from '../utils/ai.js';
import { ReviewResult, InlineAnnotation } from '../core/types.js';
import { parseJSON } from '../utils/json.js';
import { readFile, writeFile } from 'fs/promises';

export class ReviewerAgent {
  private session: Session;
  private ai: AIClient;

  constructor(session: Session, ai: AIClient) {
    this.session = session;
    this.ai = ai;
  }

  async review(documentPath: string): Promise<ReviewResult> {
    console.log('\n=== 审阅阶段 ===\n');

    const content = await this.session.contextManager.loadFullDocument(documentPath);

    const systemPrompt = `你是一位专业的游戏策划文档审阅专家。从以下四个维度审阅文档：
1. 内容逻辑
2. 内部一致性
3. 行业最佳实践
4. 实施可行性

提供内联批注和总结。以JSON格式输出：
- inline: 数组，每项包含 {file, line, type, message, severity}
- summary: 总体评估
- severity: 发现的最高严重程度 (critical/major/minor)

使用中文输出所有内容。`;

    const response = await this.ai.chat([
      { role: 'user', content: `审阅这份文档:\n\n${content}` }
    ], systemPrompt);

    const result: ReviewResult = parseJSON(response);

    console.log(`\n=== 审阅总结 ===`);
    console.log(`严重程度: ${result.severity}`);
    console.log(`\n${result.summary}\n`);

    if (result.inline.length > 0) {
      console.log(`发现 ${result.inline.length} 条批注:`);

      const criticalCount = result.inline.filter(a => a.severity === 'critical').length;
      const majorCount = result.inline.filter(a => a.severity === 'major').length;
      const minorCount = result.inline.filter(a => a.severity === 'minor').length;

      console.log(`  - Critical: ${criticalCount}`);
      console.log(`  - Major: ${majorCount}`);
      console.log(`  - Minor: ${minorCount}\n`);

      result.inline.forEach(a => {
        console.log(`  [${a.severity}] 第${a.line}行 (${a.type}): ${a.message}`);
      });
    }

    return result;
  }

  async fixIssues(documentPath: string, issues: InlineAnnotation[]): Promise<void> {
    console.log('\n=== 修复问题 ===\n');

    const content = await readFile(documentPath, 'utf-8');
    const sections = this.parseDocument(content);

    for (const issue of issues) {
      console.log(`修复 [${issue.severity}]: ${issue.message.substring(0, 50)}...`);

      const sectionIndex = this.findSectionByLine(sections, issue.line);
      if (sectionIndex >= 0) {
        sections[sectionIndex].content = await this.fixSection(
          sections[sectionIndex].content,
          issue
        );
      }
    }

    const fixedDocument = this.reconstructDocument(sections);
    await writeFile(documentPath, fixedDocument);
    console.log('\n✓ 问题修复完成\n');
  }

  private parseDocument(content: string): { title: string; content: string }[] {
    const sections: { title: string; content: string }[] = [];
    const lines = content.split('\n');

    let currentSection: { title: string; content: string } | null = null;

    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = { title: line.replace('## ', ''), content: '' };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  private findSectionByLine(sections: { title: string; content: string }[], targetLine: string): number {
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].title.includes(targetLine) || sections[i].content.includes(targetLine)) {
        return i;
      }
    }
    return 0; // 默认修改第一个章节
  }

  private async fixSection(content: string, issue: InlineAnnotation): Promise<string> {
    const systemPrompt = `你是游戏策划文档专家。根据审阅意见修复文档问题。保持风格一致，只修复指出的问题。`;

    const userPrompt = `原内容:
${content}

问题: [${issue.severity}] ${issue.message}
类型: ${issue.type}

修复该问题，输出修复后的完整内容。`;

    const response = await this.ai.chat([
      { role: 'user', content: userPrompt }
    ], systemPrompt);

    return response;
  }

  private reconstructDocument(sections: { title: string; content: string }[]): string {
    return '# 游戏策划文档\n\n' +
      sections.map(s => `## ${s.title}\n${s.content}`).join('\n');
  }

  async reviewAndFix(documentPath: string, maxIterations: number = 3): Promise<void> {
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      console.log(`\n========== 审阅迭代 ${iteration}/${maxIterations} ==========`);

      const result = await this.review(documentPath);

      // 收集需要修复的问题
      const criticalIssues = result.inline.filter(a => a.severity === 'critical');
      const majorIssues = result.inline.filter(a => a.severity === 'major');

      if (criticalIssues.length === 0 && majorIssues.length === 0) {
        console.log('\n✓ 没有critical或major问题，审阅通过！');
        break;
      }

      // 优先修复critical，然后是major
      const issuesToFix = [...criticalIssues, ...majorIssues];
      console.log(`\n需要修复 ${issuesToFix.length} 个问题 (${criticalIssues.length} critical, ${majorIssues.length} major)`);

      await this.fixIssues(documentPath, issuesToFix);

      if (iteration === maxIterations) {
        console.log('\n⚠ 达到最大迭代次数，仍有问题未完全解决');
      }
    }
  }
}
