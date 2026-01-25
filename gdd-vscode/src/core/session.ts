import * as vscode from 'vscode';
import { SessionState, InterviewSummary, ConversationBranch } from './types';
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
    const activeBranchId = this.state.activeBranchId || 'main';

    if (activeBranchId === 'main') {
      if (!this.state.conversationHistory) {
        this.state.conversationHistory = [];
      }
      this.state.conversationHistory.push(message);
    } else {
      if (!this.state.branches) this.state.branches = {};
      const branch = this.state.branches[activeBranchId];
      if (branch) {
        branch.history.push(message);
      }
    }
    await this.saveState();
  }

  async setLlmSelection(selection: { providerId: string; modelId: string } | undefined) {
    this.state.llmSelection = selection;
    await this.saveState();
  }

  getConversationHistory(): Array<{ role: 'ai' | 'user'; content: string }> {
    const activeBranchId = this.state.activeBranchId || 'main';
    if (activeBranchId === 'main') {
      return this.state.conversationHistory || [];
    }
    return this.state.branches?.[activeBranchId]?.history || [];
  }

  async createBranch(topic: string): Promise<string> {
    const branchId = `branch-${Date.now()}`;
    if (!this.state.branches) this.state.branches = {};

    this.state.branches[branchId] = {
      id: branchId,
      topic,
      history: [],
      parentId: 'main',
      createdAt: Date.now()
    };

    this.state.activeBranchId = branchId;
    await this.saveState();
    return branchId;
  }

  async switchBranch(branchId: string) {
    if (branchId !== 'main' && (!this.state.branches || !this.state.branches[branchId])) {
      throw new Error(`Branch ${branchId} not found`);
    }
    this.state.activeBranchId = branchId;
    await this.saveState();
  }

  async deleteBranch(branchId: string) {
    if (this.state.branches && this.state.branches[branchId]) {
      delete this.state.branches[branchId];
      if (this.state.activeBranchId === branchId) {
        this.state.activeBranchId = 'main';
      }
      await this.saveState();
    }
  }

  getActiveBranchId(): string {
    return this.state.activeBranchId || 'main';
  }

  getActiveBranchTopic(): string | undefined {
    const id = this.getActiveBranchId();
    if (id === 'main') return undefined;
    return this.state.branches?.[id]?.topic;
  }

  async getMarkdownDocument(): Promise<vscode.TextDocument> {
    const outputDir = this.state.outputDir || 'docs';
    const docPath = path.join(this.workspaceRoot, outputDir, 'game-design-document.md');
    try {
      return await vscode.workspace.openTextDocument(docPath);
    } catch (error) {
      // If file doesn't exist yet, we might want to create it or throw
      throw new Error(`Document not found at ${docPath}`);
    }
  }
}
