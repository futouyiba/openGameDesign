import { DocumentMetadata } from './types.js';
import { AIClient } from '../utils/ai.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

interface SectionSummary {
  title: string;
  summary: string;
  startLine: number;
  endLine: number;
}

export class ContextManager {
  private summaries: Map<string, SectionSummary[]> = new Map();
  private fullSections: Map<string, Map<string, string>> = new Map();
  private ai: AIClient;
  private cacheDir: string;

  constructor(ai: AIClient, projectRoot: string) {
    this.ai = ai;
    this.cacheDir = join(projectRoot, '.gdd', 'metadata', 'summaries');
  }

  async init() {
    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
    }
  }

  // 为文档生成章节摘要
  async generateDocumentSummaries(filePath: string): Promise<SectionSummary[]> {
    console.log(`\n生成文档摘要: ${filePath}`);

    const content = await readFile(filePath, 'utf-8');
    const sections = this.parseDocumentSections(content);

    const summaries: SectionSummary[] = [];

    for (const section of sections) {
      console.log(`  - 摘要章节: ${section.title}`);

      const summary = await this.ai.chat([{
        role: 'user',
        content: `总结以下内容为1-2句话:\n\n${section.content}`
      }], '你是文档摘要专家。用1-2句话总结内容核心要点。');

      summaries.push({
        title: section.title,
        summary,
        startLine: section.startLine,
        endLine: section.endLine
      });
    }

    // 缓存摘要
    this.summaries.set(filePath, summaries);
    await this.saveSummariesToCache(filePath, summaries);

    console.log(`✓ 生成 ${summaries.length} 个章节摘要\n`);
    return summaries;
  }

  // 加载文档摘要（优先从缓存）
  async loadDocumentSummaries(filePath: string): Promise<SectionSummary[]> {
    if (this.summaries.has(filePath)) {
      return this.summaries.get(filePath)!;
    }

    // 尝试从缓存加载
    const cached = await this.loadSummariesFromCache(filePath);
    if (cached) {
      this.summaries.set(filePath, cached);
      return cached;
    }

    // 生成新摘要
    return await this.generateDocumentSummaries(filePath);
  }

  // 按需加载特定章节全文
  async loadSection(filePath: string, sectionTitle: string): Promise<string> {
    if (!this.fullSections.has(filePath)) {
      this.fullSections.set(filePath, new Map());
    }

    const sections = this.fullSections.get(filePath)!;
    if (sections.has(sectionTitle)) {
      return sections.get(sectionTitle)!;
    }

    console.log(`  加载章节全文: ${sectionTitle}`);

    const content = await readFile(filePath, 'utf-8');
    const parsed = this.parseDocumentSections(content);
    const section = parsed.find(s => s.title === sectionTitle);

    if (!section) {
      throw new Error(`Section not found: ${sectionTitle}`);
    }

    sections.set(sectionTitle, section.content);
    return section.content;
  }

  // 加载完整文档（用于审阅等需要全文的场景）
  async loadFullDocument(filePath: string): Promise<string> {
    return await readFile(filePath, 'utf-8');
  }

  // 构建上下文（摘要优先，按需加载全文）
  async buildContext(filePath: string, relevantSections?: string[]): Promise<string> {
    const summaries = await this.loadDocumentSummaries(filePath);

    if (!relevantSections || relevantSections.length === 0) {
      // 返回所有章节摘要
      return summaries.map(s =>
        `## ${s.title}\n摘要: ${s.summary}`
      ).join('\n\n');
    }

    // 返回相关章节的全文 + 其他章节的摘要
    const parts: string[] = [];

    for (const summary of summaries) {
      if (relevantSections.includes(summary.title)) {
        const fullContent = await this.loadSection(filePath, summary.title);
        parts.push(`## ${summary.title}\n${fullContent}`);
      } else {
        parts.push(`## ${summary.title}\n摘要: ${summary.summary}`);
      }
    }

    return parts.join('\n\n');
  }

  // 清理上下文（释放内存）
  clearContext(filePath?: string) {
    if (filePath) {
      this.summaries.delete(filePath);
      this.fullSections.delete(filePath);
      console.log(`✓ 清理上下文: ${filePath}`);
    } else {
      this.summaries.clear();
      this.fullSections.clear();
      console.log('✓ 清理所有上下文');
    }
  }

  private parseDocumentSections(content: string): Array<{
    title: string;
    content: string;
    startLine: number;
    endLine: number;
  }> {
    const sections: Array<{
      title: string;
      content: string;
      startLine: number;
      endLine: number;
    }> = [];

    const lines = content.split('\n');
    let currentSection: {
      title: string;
      content: string;
      startLine: number;
      endLine: number;
    } | null = null;

    lines.forEach((line, index) => {
      if (line.startsWith('## ')) {
        if (currentSection) {
          currentSection.endLine = index - 1;
          sections.push(currentSection);
        }
        currentSection = {
          title: line.replace('## ', ''),
          content: '',
          startLine: index,
          endLine: index
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    });

    if (currentSection) {
      (currentSection as any).endLine = lines.length - 1;
      sections.push(currentSection);
    }

    return sections;
  }

  private async saveSummariesToCache(filePath: string, summaries: SectionSummary[]) {
    const cacheFile = join(this.cacheDir, this.getCacheFileName(filePath));
    await writeFile(cacheFile, JSON.stringify(summaries, null, 2));
  }

  private async loadSummariesFromCache(filePath: string): Promise<SectionSummary[] | null> {
    const cacheFile = join(this.cacheDir, this.getCacheFileName(filePath));
    if (!existsSync(cacheFile)) {
      return null;
    }

    const data = await readFile(cacheFile, 'utf-8');
    return JSON.parse(data);
  }

  private getCacheFileName(filePath: string): string {
    return filePath.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
  }
}
