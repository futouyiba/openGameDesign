import * as vscode from 'vscode';
import { SessionState, InterviewSummary } from './types';
import { MailSystem } from './mail';
import * as path from 'path';

export class Session {
  private state: SessionState;
  private workspaceRoot: string;
  public mailSystem: MailSystem;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.state = { phase: 'interview' };
    this.mailSystem = new MailSystem(workspaceRoot);
  }

  async init() {
    const gddDir = path.join(this.workspaceRoot, '.gdd');
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(gddDir));
    await this.mailSystem.init();
    await this.loadState();
  }

  async loadState() {
    const configPath = path.join(this.workspaceRoot, '.gdd', 'config.json');
    try {
      const data = await vscode.workspace.fs.readFile(vscode.Uri.file(configPath));
      this.state = JSON.parse(data.toString());
    } catch {
      // 文件不存在，使用默认状态
    }
  }

  async saveState() {
    const configPath = path.join(this.workspaceRoot, '.gdd', 'config.json');
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(configPath),
      Buffer.from(JSON.stringify(this.state, null, 2))
    );
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

  async setInterviewSummary(summary: InterviewSummary) {
    this.state.interviewSummary = summary;
    await this.saveState();
  }

  async setConversationHistory(history: Array<{ role: 'ai' | 'user'; content: string }>) {
    this.state.conversationHistory = history;
    await this.saveState();
  }

  async addConversationMessage(message: { role: 'ai' | 'user'; content: string }) {
    if (!this.state.conversationHistory) {
      this.state.conversationHistory = [];
    }
    this.state.conversationHistory.push(message);
    await this.saveState();
  }

  async setLlmSelection(selection: { providerId: string; modelId: string }) {
    this.state.llmSelection = selection;
    await this.saveState();
  }

  getConversationHistory(): Array<{ role: 'ai' | 'user'; content: string }> {
    return this.state.conversationHistory || [];
  }
}
