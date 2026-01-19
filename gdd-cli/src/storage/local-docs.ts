import { readFile } from 'fs/promises';
import { glob } from 'glob';
import { join, relative } from 'path';

interface LocalDocument {
  path: string;
  title: string;
  summary: string;
  content: string;
}

export class LocalDocumentLibrary {
  private documents: LocalDocument[] = [];
  private indexed: boolean = false;

  async scanDirectory(directory: string, pattern: string = '**/*.md'): Promise<void> {
    console.log(`\n📁 扫描本地文档库: ${directory}`);

    const files = await glob(pattern, {
      cwd: directory,
      absolute: true,
      ignore: ['**/node_modules/**', '**/.git/**', '**/.gdd/**']
    });

    console.log(`  找到 ${files.length} 个文档`);

    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        const title = this.extractTitle(content) || relative(directory, file);
        const summary = this.extractSummary(content);

        this.documents.push({
          path: file,
          title,
          summary,
          content
        });
      } catch (error) {
        console.log(`  ⚠ 无法读取: ${file}`);
      }
    }

    this.indexed = true;
    console.log(`✓ 索引完成: ${this.documents.length} 个文档\n`);
  }

  search(query: string, maxResults: number = 3): LocalDocument[] {
    if (!this.indexed) {
      return [];
    }

    const queryLower = query.toLowerCase();

    // 简单的关键词匹配
    const results = this.documents
      .filter(doc =>
        doc.title.toLowerCase().includes(queryLower) ||
        doc.summary.toLowerCase().includes(queryLower) ||
        doc.content.toLowerCase().includes(queryLower)
      )
      .slice(0, maxResults);

    return results;
  }

  getDocument(path: string): LocalDocument | undefined {
    return this.documents.find(doc => doc.path === path);
  }

  getAllDocuments(): LocalDocument[] {
    return this.documents;
  }

  private extractTitle(content: string): string | null {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('# ')) {
        return line.replace('# ', '').trim();
      }
    }
    return null;
  }

  private extractSummary(content: string): string {
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const contentLines = lines.filter(l => !l.startsWith('#'));
    return contentLines.slice(0, 3).join(' ').substring(0, 200) + '...';
  }
}
