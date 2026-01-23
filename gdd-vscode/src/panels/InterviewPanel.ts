import * as vscode from 'vscode';
import { Session } from '../core/session';
import { AIClient } from '../utils/ai';
import { LlmSelection } from '../llm/types';
import OpenAI from 'openai';
import { InterviewerAgent } from '../agents/interviewer';
import { log } from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs';

export class InterviewPanel {
    public static currentPanel: InterviewPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private session: Session;
    private ai: AIClient;
    private interviewer: InterviewerAgent;
    private conversationHistory: Array<{ role: 'ai' | 'user'; content: string }> = [];
    private context: vscode.ExtensionContext;

    private constructor(
        panel: vscode.WebviewPanel,
        context: vscode.ExtensionContext,
        session: Session,
        selection: LlmSelection
    ) {
        this._panel = panel;
        this.context = context;

        // 使用外部传入的 Session 和 Selection
        this.session = session;
        this.ai = new AIClient(context, selection);
        this.interviewer = new InterviewerAgent(this.session, this.ai);

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // 重要：先设置消息监听器，再设置 HTML 内容
        // 否则 Webview 的 init 消息可能在监听器设置之前就发送了
        this._panel.webview.onDidReceiveMessage(
            async message => {
                log('Received message from webview', { command: message.command });
                try {
                    switch (message.command) {
                        case 'log':
                            log('Webview log', { text: message.text });
                            return;
                        case 'init':
                            log('Processing init command');
                            await this.initializeInterview();
                            log('Init completed');
                            return;
                        case 'answer':
                            log('Webview sent answer', { text: message.text });
                            await this.handleUserAnswer(message.text);
                            return;
                        case 'transcribe':
                            await this.handleTranscription(message.audio);
                            return;
                        case 'done':
                            await this.finishInterview();
                            return;
                    }
                } catch (error) {
                    log('Error in message handler', { command: message.command, error: String(error) });
                    vscode.window.showErrorMessage(`处理消息失败: ${error}`);
                }
            },
            null,
            this._disposables
        );

        // 设置 HTML 内容（这会触发 Webview 渲染和 init 消息）
        const html = this._getHtmlContent();
        log('Setting webview HTML', { length: html.length });
        this._panel.webview.html = html;
    }

    private async initializeInterview() {
        log('initializeInterview called');
        const state = this.session.getState();
        log('Session state', { phase: state.phase });
        const history = this.session.getConversationHistory();
        log('Conversation history length', { length: history.length });

        if (history.length > 0) {
            // 恢复之前的对话
            for (const message of history) {
                if (message.role === 'ai') {
                    await this.sendAIMessage(message.content);
                } else {
                    this.displayUserMessage(message.content);
                }
            }
        } else {
            // 新访谈，发送初始问候
            log('Sending initial greeting');
            await this.sendAIMessage('你好！我将帮助你创建游戏策划文档。请告诉我，你想创建什么类型的游戏？');
        }

        this.conversationHistory = history;
        log('initializeInterview completed');
    }

    private displayUserMessage(text: string) {
        this._panel.webview.postMessage({
            command: 'displayUserMessage',
            text: text
        });
    }

    private async handleUserAnswer(text: string) {
        this.conversationHistory.push({ role: 'user', content: text });
        await this.session.addConversationMessage({ role: 'user', content: text });

        // 调用AI生成回复
        try {
            const messages = this.conversationHistory.map(m => ({
                role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
                content: m.content
            }));

            const systemPrompt = '你是一位专业的游戏策划访谈专家。通过深入的提问来充分理解用户的游戏设计文档需求。每次只问一个问题。保持简洁直接。使用中文交流。';

            log('Calling AI.chat...', { messages, systemPrompt });
            const response = await this.ai.chat(messages, systemPrompt);
            log('AI.chat response received', { response });

            this.conversationHistory.push({ role: 'ai', content: response });
            await this.session.addConversationMessage({ role: 'ai', content: response });

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

            // 使用 Anthropic API 的 Whisper 功能（如果支持）或调用外部 Whisper API
            // 这里简化处理，实际需要集成 Whisper API
            const transcription = await this.transcribeAudio(audioBuffer);

            this._panel.webview.postMessage({
                command: 'transcription',
                text: transcription
            });
        } catch (error) {
            vscode.window.showErrorMessage(`语音转录失败: ${error}`);
        }
    }

    private async transcribeAudio(audioBuffer: Buffer): Promise<string> {
        const apiKey = vscode.workspace.getConfiguration('gdd').get<string>('openaiApiKey')
            || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            throw new Error('请在设置中配置 OpenAI API Key (gdd.openaiApiKey)');
        }

        const openai = new OpenAI({ apiKey });

        // 将 Buffer 转换为 File 对象
        const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
            language: 'zh'
        });

        return transcription.text;
    }

    private async sendAIMessage(text: string) {
        this._panel.webview.postMessage({
            command: 'aiMessage',
            text: text
        });
    }

    private async finishInterview() {
        // 生成访谈总结
        vscode.window.showInformationMessage('正在生成访谈总结...');

        try {
            const messages = this.conversationHistory.map(m => ({
                role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
                content: m.content
            }));

            messages.push({
                role: 'user',
                content: `基于访谈对话，生成结构化的总结，包括：
1. understanding: 用户想要创建什么
2. keyDecisions: 访谈中做出的重要决策（对象格式）
3. writingDirection: 写作阶段的明确方向

以JSON格式输出，使用中文。`
            });

            const summaryResponse = await this.ai.chat(messages, '你是文档摘要专家。');
            const summary = JSON.parse(summaryResponse.replace(/```json\n?|\n?```/g, ''));

            await this.session.setInterviewSummary(summary);
            await this.session.setPhase('writing');

            vscode.window.showInformationMessage('访谈完成！开始写作...');
            this._panel.dispose();

            // 触发写作阶段
            vscode.commands.executeCommand('gdd.startWriting');
        } catch (error) {
            vscode.window.showErrorMessage(`生成总结失败: ${error}`);
        }
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
            // Load from dist/webview/index.html
            const distPath = path.join(this.context.extensionPath, 'dist', 'webview');
            const indexPath = path.join(distPath, 'index.html');

            log('Loading Webview from', { indexPath });

            if (!fs.existsSync(indexPath)) {
                log('Error: Webview index.html not found', { indexPath });
                return `<!DOCTYPE html><html><body>Error: Webview build not found at ${indexPath}. Please run 'npm run ui:build'.</body></html>`;
            }

            let html = fs.readFileSync(indexPath, 'utf-8');

            const assetsPath = vscode.Uri.file(path.join(distPath, 'assets'));
            const assetsUri = this._panel.webview.asWebviewUri(assetsPath);

            // Replace /assets/ with vscode-resource URI (Vite output uses absolute path /assets/...)
            html = html.replace(/\/assets\//g, `${assetsUri}/`);

            // Inject CSP
            const cspSource = this._panel.webview.cspSource;
            // Allow scripts from vscode-resource and safe inline (for React hydration or fast refresh if dev)
            // Stricter: script-src ${cspSource} 'nonce-...' but Vite doesn't output nonce easily.
            // We use permissive for now but explicit.
            const csp = `default-src 'none'; connect-src ${cspSource} https:; font-src ${cspSource}; img-src ${cspSource} https: data:; script-src 'unsafe-inline' 'unsafe-eval' ${cspSource}; style-src 'unsafe-inline' ${cspSource};`;

            html = html.replace(
                '<head>',
                `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}">`
            );

            return html;
        } catch (e) {
            log('Error loading webview html', { error: String(e) });
            return `<!DOCTYPE html><html><body>Error loading Webview: ${e}</body></html>`;
        }
    }
}
