import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export class DecisionTracker {
  private decisionsPath: string;
  private decisions: Record<string, any> = {};

  constructor(projectRoot: string) {
    this.decisionsPath = join(projectRoot, '.gdd', 'decisions.json');
  }

  async init() {
    if (existsSync(this.decisionsPath)) {
      const data = await readFile(this.decisionsPath, 'utf-8');
      this.decisions = JSON.parse(data);
    }
  }

  async record(key: string, value: any) {
    this.decisions[key] = { value, timestamp: new Date() };
    await this.save();
  }

  get(key: string) {
    return this.decisions[key]?.value;
  }

  private async save() {
    await writeFile(this.decisionsPath, JSON.stringify(this.decisions, null, 2));
  }
}
