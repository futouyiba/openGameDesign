import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';

interface Decision {
  decision: string;
  rationale: string;
  timestamp: string;
}

interface Alternative {
  option: string;
  rejectionReason: string;
}

interface UnderwaterDoc {
  context: string[];
  decisions: Decision[];
  alternatives: Alternative[];
  tradeoffs: string[];
  risks: string[];
  openQuestions: string[];
}

export class UnderwaterDocManager {
  private docPath: string;
  private underwaterPath: string;
  private data: UnderwaterDoc;

  constructor(docPath: string) {
    this.docPath = docPath;
    this.underwaterPath = docPath.replace(/\.md$/, '.underwater.md');
    this.data = {
      context: [],
      decisions: [],
      alternatives: [],
      tradeoffs: [],
      risks: [],
      openQuestions: []
    };
  }

  async load() {
    if (existsSync(this.underwaterPath)) {
      const content = await readFile(this.underwaterPath, 'utf-8');
      this.parseFromMarkdown(content);
    }
  }

  addContext(item: string) {
    if (!this.data.context.includes(item)) {
      this.data.context.push(item);
    }
  }

  addDecision(decision: string, rationale: string) {
    this.data.decisions.push({
      decision,
      rationale,
      timestamp: new Date().toISOString()
    });
  }

  addAlternative(option: string, rejectionReason: string) {
    this.data.alternatives.push({ option, rejectionReason });
  }

  addTradeoff(tradeoff: string) {
    if (!this.data.tradeoffs.includes(tradeoff)) {
      this.data.tradeoffs.push(tradeoff);
    }
  }

  addRisk(risk: string) {
    if (!this.data.risks.includes(risk)) {
      this.data.risks.push(risk);
    }
  }

  addOpenQuestion(question: string) {
    if (!this.data.openQuestions.includes(question)) {
      this.data.openQuestions.push(question);
    }
  }

  async save() {
    const markdown = this.toMarkdown();
    await writeFile(this.underwaterPath, markdown);
  }

  private toMarkdown(): string {
    let md = `# Underwater Doc\n\n`;
    md += `> Internal rationale for: ${this.docPath.split(/[\\/]/).pop()}\n\n`;

    if (this.data.context.length > 0) {
      md += `## Context & Constraints\n\n`;
      this.data.context.forEach(c => md += `- ${c}\n`);
      md += `\n`;
    }

    if (this.data.decisions.length > 0) {
      md += `## Decision Log\n\n`;
      this.data.decisions.forEach(d => {
        md += `### ${d.decision}\n`;
        md += `- **Rationale**: ${d.rationale}\n`;
        md += `- **Date**: ${d.timestamp.split('T')[0]}\n\n`;
      });
    }

    if (this.data.alternatives.length > 0) {
      md += `## Alternatives Considered\n\n`;
      this.data.alternatives.forEach(a => {
        md += `- **${a.option}**: ${a.rejectionReason}\n`;
      });
      md += `\n`;
    }

    if (this.data.tradeoffs.length > 0) {
      md += `## Trade-offs\n\n`;
      this.data.tradeoffs.forEach(t => md += `- ${t}\n`);
      md += `\n`;
    }

    if (this.data.risks.length > 0) {
      md += `## Risks\n\n`;
      this.data.risks.forEach(r => md += `- ${r}\n`);
      md += `\n`;
    }

    if (this.data.openQuestions.length > 0) {
      md += `## Open Questions\n\n`;
      this.data.openQuestions.forEach(q => md += `- ${q}\n`);
      md += `\n`;
    }

    return md;
  }

  private parseFromMarkdown(content: string) {
    // Simple parser - can be enhanced
    const lines = content.split('\n');
    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('## ')) {
        currentSection = line.substring(3).trim();
      } else if (line.startsWith('- ') && currentSection) {
        const item = line.substring(2).trim();
        if (currentSection === 'Context & Constraints') {
          this.data.context.push(item);
        } else if (currentSection === 'Trade-offs') {
          this.data.tradeoffs.push(item);
        } else if (currentSection === 'Risks') {
          this.data.risks.push(item);
        } else if (currentSection === 'Open Questions') {
          this.data.openQuestions.push(item);
        }
      }
    }
  }
}
