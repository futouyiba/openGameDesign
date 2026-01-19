import { SessionState } from './types.js';
import { MailSystem } from './mail.js';
import { ContextManager } from './context.js';
import { AIClient } from '../utils/ai.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export class Session {
  private state: SessionState;
  private projectRoot: string;
  private configPath: string;

  public mailSystem: MailSystem;
  public contextManager: ContextManager;

  constructor(projectRoot: string, ai: AIClient) {
    this.projectRoot = projectRoot;
    this.configPath = join(projectRoot, '.gdd', 'config.json');
    this.state = { phase: 'interview' };
    this.mailSystem = new MailSystem(projectRoot);
    this.contextManager = new ContextManager(ai, projectRoot);
  }

  async init() {
    const gddDir = join(this.projectRoot, '.gdd');
    if (!existsSync(gddDir)) {
      await mkdir(gddDir, { recursive: true });
    }

    await this.mailSystem.init();
    await this.contextManager.init();
    await this.loadState();
  }

  async loadState() {
    if (existsSync(this.configPath)) {
      const data = await readFile(this.configPath, 'utf-8');
      this.state = JSON.parse(data);
    }
  }

  async saveState() {
    await writeFile(this.configPath, JSON.stringify(this.state, null, 2));
  }

  getState(): SessionState {
    return this.state;
  }

  async setPhase(phase: SessionState['phase']) {
    this.state.phase = phase;
    await this.saveState();
  }

  async setCurrentDocument(doc: string) {
    this.state.currentDocument = doc;
    await this.saveState();
  }

  async setInterviewSummary(summary: SessionState['interviewSummary']) {
    this.state.interviewSummary = summary;
    await this.saveState();
  }
}
