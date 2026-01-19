import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface Reference {
  title: string;
  url?: string;
  content: string;
  timestamp: Date;
}

export class ReferenceManager {
  private references: Map<string, Reference[]> = new Map();
  private referencesPath: string;

  constructor(projectRoot: string) {
    this.referencesPath = join(projectRoot, '.gdd', 'references.json');
  }

  async init() {
    if (existsSync(this.referencesPath)) {
      const data = await readFile(this.referencesPath, 'utf-8');
      const refs = JSON.parse(data);
      this.references = new Map(Object.entries(refs));
    }
  }

  addReference(documentPath: string, reference: Omit<Reference, 'timestamp'>) {
    if (!this.references.has(documentPath)) {
      this.references.set(documentPath, []);
    }

    this.references.get(documentPath)!.push({
      ...reference,
      timestamp: new Date()
    });
  }

  getReferences(documentPath: string): Reference[] {
    return this.references.get(documentPath) || [];
  }

  async save() {
    const obj: Record<string, Reference[]> = {};
    this.references.forEach((value, key) => {
      obj[key] = value;
    });
    await writeFile(this.referencesPath, JSON.stringify(obj, null, 2));
  }

  formatReferencesSection(documentPath: string): string {
    const refs = this.getReferences(documentPath);
    if (refs.length === 0) return '';

    let section = '\n\n## 参考资料\n\n';
    refs.forEach((ref, index) => {
      if (ref.url) {
        section += `${index + 1}. [${ref.title}](${ref.url})\n`;
      } else {
        section += `${index + 1}. ${ref.title}\n`;
      }
    });

    return section;
  }
}
