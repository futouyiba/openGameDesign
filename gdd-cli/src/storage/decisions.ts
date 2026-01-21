import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';

export interface DecisionItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'high' | 'medium' | 'low';
  impact: string[];
  rationale: string;
  alternatives: { option: string, reason: string }[];
  author: string;
  timestamp: string;
  history: { action: string, timestamp: string, actor: string }[];
}

export class DecisionTracker {
  private decisionsPath: string;
  private decisions: DecisionItem[] = [];

  constructor(projectRoot: string) {
    this.decisionsPath = join(projectRoot, '.gdd', 'decisions.json');
  }

  async init() {
    if (existsSync(this.decisionsPath)) {
      try {
        const data = await readFile(this.decisionsPath, 'utf-8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          this.decisions = parsed;
        } else {
          this.decisions = [];
        }
      } catch (error) {
        console.error('Failed to parse decisions file:', error);
        this.decisions = [];
      }
    }
  }

  async create(decision: Omit<DecisionItem, 'id' | 'timestamp' | 'history'>): Promise<string> {
    const id = randomUUID();
    const timestamp = new Date().toISOString();
    
    const newDecision: DecisionItem = {
      ...decision,
      id,
      timestamp,
      history: [
        {
          action: 'created',
          timestamp,
          actor: decision.author
        }
      ]
    };

    this.decisions.push(newDecision);
    await this.save();
    return id;
  }

  async update(id: string, updates: Partial<DecisionItem>): Promise<void> {
    const index = this.decisions.findIndex(d => d.id === id);
    if (index === -1) {
      throw new Error(`Decision with id ${id} not found`);
    }

    const currentDecision = this.decisions[index];
    const timestamp = new Date().toISOString();
    
    let action = 'updated';
    if (updates.status && updates.status !== currentDecision.status) {
      action = `status changed to ${updates.status}`;
    }

    const historyEntry = {
      action,
      timestamp,
      actor: updates.author || 'system'
    };

    // Remove fields that shouldn't be updated manually
    const { id: _, timestamp: __, history: ___, ...validUpdates } = updates;

    this.decisions[index] = {
      ...currentDecision,
      ...validUpdates,
      history: [
        ...currentDecision.history,
        historyEntry
      ]
    };

    await this.save();
  }

  get(id: string): DecisionItem | undefined {
    return this.decisions.find(d => d.id === id);
  }

  list(filter?: { status?: string, priority?: string }): DecisionItem[] {
    return this.decisions.filter(d => {
      if (filter?.status && d.status !== filter.status) return false;
      if (filter?.priority && d.priority !== filter.priority) return false;
      return true;
    });
  }

  async delete(id: string): Promise<void> {
    const index = this.decisions.findIndex(d => d.id === id);
    if (index !== -1) {
      this.decisions.splice(index, 1);
      await this.save();
    }
  }

  private async save() {
    const dir = dirname(this.decisionsPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(this.decisionsPath, JSON.stringify(this.decisions, null, 2));
  }
}
