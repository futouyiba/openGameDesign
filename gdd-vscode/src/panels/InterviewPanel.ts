import * as vscode from 'vscode';
import { Session } from '../core/session';
import { AIClient } from '../utils/ai';
import { LlmSelection } from '../llm/types';
import { log } from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs';
import { TranscriptionService } from '../services/transcriptionService';
import { InterviewManager } from '../core/interviewManager';

export class InterviewPanel {
    public static currentPanel: InterviewPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private session: Session;
    private ai: AIClient;
    private selection: LlmSelection;
    private conversationHistory: Array<{ role: 'ai' | 'user'; content: string }> = [];
    private context: vscode.ExtensionContext;

    // Services
    private transcriptionService: TranscriptionService;
    private interviewManager: InterviewManager;

    private constructor(
        panel: vscode.WebviewPanel,
        context: vscode.ExtensionContext,
        session: Session,
        selection: LlmSelection
    ) {
        this._panel = panel;
        this.context = context;
        this.session = session;
        this.selection = selection;
        this.ai = new AIClient(context, selection);

        // Initialize Services
        this.transcriptionService = new TranscriptionService(this.ai);
        this.interviewManager = new InterviewManager(context, session, this.ai);

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async message => {
                log('Received message', { command: message.command });
                try {
                    switch (message.command) {
                        case 'log':
                            log('Webview log', { text: message.text });
                            break;
                        case 'init':
                            await this.initializeInterview();
                            break;
                        case 'createBranch':
                            await this.handleCreateBranch(message.topic);
                            break;
                        case 'switchBranch':
                            await this.handleSwitchBranch(message.branchId);
                            break;
                        case 'mergeBranch':
                            await this.handleMergeBranch();
                            break;
                        case 'answer':
                            await this.handleUserAnswer(message.text);
                            break;
                        case 'transcribe':
                            await this.handleTranscription(message.audio);
                            break;
                        case 'done':
                            await this.finishInterview();
                            break;
                    }
                } catch (error) {
                    log('Message handler error', { error: String(error) });
                    vscode.window.showErrorMessage(`Error: ${error}`);
                }
            },
            null,
            this._disposables
        );

        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('gdd')) {
                this.sendStatus();
            }
        }, null, this._disposables);

        this._panel.webview.html = this._getHtmlContent();
    }

    private async initializeInterview() {
        this.sendStatus();
        const history = this.session.getConversationHistory();

        if (history.length > 0) {
            for (const message of history) {
                if (message.role === 'ai') {
                    await this.sendAIMessage(message.content);
                } else {
                    this.displayUserMessage(message.content);
                }
            }
        } else {
            await this.sendAIMessage('你好！我将帮助你创建游戏策划文档。请告诉我，你想创建什么类型的游戏？');
        }

        this.conversationHistory = history;
    }

    private sendStatus() {
        this._panel.webview.postMessage({
            command: 'status',
            status: {
                connected: !!this.selection,
                model: this.selection?.modelId || 'Model',
                provider: this.selection?.providerId,
                activeBranch: this.session.getActiveBranchId(),
                branchTopic: this.session.getActiveBranchTopic()
            }
        });
    }

    private async handleCreateBranch(topic: string) {
        const summary = await this.interviewManager.generateContextSummary(this.conversationHistory);
        await this.session.createBranch(topic);
        await this.session.addConversationMessage({ role: 'ai', content: `[System] 已进入子话题 "${topic}"。主线背景：${summary}` });
        await this.reloadContext();
    }

    private async handleSwitchBranch(branchId: string) {
        await this.session.switchBranch(branchId);
        await this.reloadContext();
    }

    private async handleMergeBranch() {
        const topic = this.session.getActiveBranchTopic();
        if (!topic) return;

        const branchSummary = await this.interviewManager.generateContextSummary(
            this.conversationHistory,
            "请总结本次子话题讨论的核心结论，以便合并回主线。"
        );
        await this.session.switchBranch('main');

        const mergeMsg = `[System] 子话题 "${topic}" 已结束。结论摘要：${branchSummary}`;
        await this.session.addConversationMessage({ role: 'ai', content: mergeMsg });

        await this.reloadContext();
        vscode.window.showInformationMessage(`子话题 "${topic}" 已合并。`);
    }

    private async reloadContext() {
        this.conversationHistory = this.session.getConversationHistory();
        this._panel.webview.postMessage({
            command: 'history',
            messages: this.conversationHistory
        });
        this.sendStatus();
    }

    private displayUserMessage(text: string) {
        this._panel.webview.postMessage({ command: 'displayUserMessage', text });
    }

    private async handleUserAnswer(text: string) {
        this.conversationHistory.push({ role: 'user', content: text });

        try {
            const response = await this.interviewManager.handleUserAnswer(text, this.conversationHistory);
            this.conversationHistory.push({ role: 'ai', content: response });
            await this.sendAIMessage(response);
        } catch (error) {
            vscode.window.showErrorMessage(`AI调用失败: ${error}`);
        }
    }

    private async handleTranscription(audioDataUrl: string) {
        try {
            vscode.window.showInformationMessage('正在转录语音...');
            const base64Audio = audioDataUrl.split(',')[1];
            const audioBuffer = Buffer.from(base64Audio, 'base64');

            const transcription = await this.transcriptionService.transcribeAudio(audioBuffer);

            this._panel.webview.postMessage({
                command: 'transcription',
                text: transcription
            });
        } catch (error) {
            vscode.window.showErrorMessage(`语音转录失败: ${error}`);
        }
    }

    private async sendAIMessage(text: string) {
        this._panel.webview.postMessage({ command: 'aiMessage', text });
    }

    private async finishInterview() {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "正在生成访谈总结...",
            cancellable: false
        }, async (progress) => {
            try {
                const messages = this.conversationHistory.map(m => ({
                    role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
                    content: m.content
                }));

                messages.push({
                    role: 'user',
                    content: `基于访谈对话，生成结构化的总结(JSON, 中文)：1. understanding 2. keyDecisions 3. writingDirection`
                });

                progress.report({ message: "AI 正在分析对话..." });
                const summaryResponse = await this.ai.chat(messages, '你是文档摘要专家。');

                progress.report({ message: "正在保存总结..." });
                const summary = JSON.parse(summaryResponse.replace(/```json\n?|\n?```/g, ''));

                await this.session.setInterviewSummary(summary);
                await this.session.setPhase('writing');

                vscode.window.showInformationMessage('访谈完成！开始写作...');
                this._panel.dispose();
                vscode.commands.executeCommand('gdd.startWriting');
            } catch (error) {
                vscode.window.showErrorMessage(`生成总结失败: ${error}`);
            }
        });
    }

    public static render(
        context: vscode.ExtensionContext,
        session: Session,
        selection: LlmSelection
    ) {
        if (InterviewPanel.currentPanel) {
            InterviewPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'gddInterview',
            'GDD 访谈',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'dist', 'webview'))
                ]
            }
        );

        InterviewPanel.currentPanel = new InterviewPanel(panel, context, session, selection);
    }

    public dispose() {
        InterviewPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private _getHtmlContent(): string {
        try {
            const distPath = path.join(this.context.extensionPath, 'dist', 'webview');
            const indexPath = path.join(distPath, 'index.html');

            if (!fs.existsSync(indexPath)) {
                return `<!DOCTYPE html><html><body>Error: Webview build not found at ${indexPath}. Please run 'npm run ui:build'.</body></html>`;
            }

            let html = fs.readFileSync(indexPath, 'utf-8');
            const assetsPath = vscode.Uri.file(path.join(distPath, 'assets'));
            const assetsUri = this._panel.webview.asWebviewUri(assetsPath);

            html = html.replace(/\/assets\//g, `${assetsUri}/`);

            const cspSource = this._panel.webview.cspSource;
            const csp = `default-src 'none'; connect-src ${cspSource} https:; font-src ${cspSource}; img-src ${cspSource} https: data:; script-src 'unsafe-inline' 'unsafe-eval' ${cspSource}; style-src 'unsafe-inline' ${cspSource};`;

            return html.replace('<head>', `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}">`);
        } catch (e) {
            return `<!DOCTYPE html><html><body>Error loading Webview: ${e}</body></html>`;
        }
    }
}
