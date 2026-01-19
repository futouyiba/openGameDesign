import * as vscode from 'vscode';
import { Session } from '../core/session';
import { AIClient } from '../utils/ai';
import { InterviewerAgent } from '../agents/interviewer';

export class InterviewPanel {
    public static currentPanel: InterviewPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private session: Session;
    private ai: AIClient;
    private interviewer: InterviewerAgent;
    private conversationHistory: Array<{ role: 'ai' | 'user'; content: string }> = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;

        // 初始化Session和AI
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
        this.session = new Session(workspaceRoot);
        this.ai = new AIClient();
        this.interviewer = new InterviewerAgent(this.session, this.ai);

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlContent();

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'init':
                        await this.session.init();
                        await this.sendAIMessage('你好！我将帮助你创建游戏策划文档。请告诉我，你想创建什么类型的游戏？');
                        return;
                    case 'answer':
                        await this.handleUserAnswer(message.text);
                        return;
                    case 'done':
                        await this.finishInterview();
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private async handleUserAnswer(text: string) {
        this.conversationHistory.push({ role: 'user', content: text });

        // 调用AI生成回复
        try {
            const messages = this.conversationHistory.map(m => ({
                role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
                content: m.content
            }));

            const systemPrompt = '你是一位专业的游戏策划访谈专家。通过深入的提问来充分理解用户的游戏设计文档需求。每次只问一个问题。保持简洁直接。使用中文交流。';

            const response = await this.ai.chat(messages, systemPrompt);

            this.conversationHistory.push({ role: 'ai', content: response });

            await this.sendAIMessage(response);
        } catch (error) {
            vscode.window.showErrorMessage(`AI调用失败: ${error}`);
        }
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

    public static render(extensionUri: vscode.Uri) {
        if (InterviewPanel.currentPanel) {
            InterviewPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
        } else {
            const panel = vscode.window.createWebviewPanel(
                'gddInterview',
                'GDD 访谈',
                vscode.ViewColumn.One,
                {
                    enableScripts: true
                }
            );

            InterviewPanel.currentPanel = new InterviewPanel(panel, extensionUri);

            // 初始化
            panel.webview.postMessage({ command: 'init' });
        }
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
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GDD 访谈</title>
    <style>
        body {
            padding: 20px;
            padding-bottom: 100px;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
        }
        .chat-container {
            max-width: 800px;
            margin: 0 auto;
        }
        .message {
            margin: 15px 0;
            padding: 10px;
            border-radius: 5px;
        }
        .ai-message {
            background: var(--vscode-editor-background);
            border-left: 3px solid var(--vscode-activityBarBadge-background);
        }
        .user-message {
            background: var(--vscode-input-background);
            border-left: 3px solid var(--vscode-button-background);
        }
        .input-area {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 20px;
            background: var(--vscode-editor-background);
            border-top: 1px solid var(--vscode-panel-border);
        }
        input {
            width: calc(100% - 120px);
            padding: 10px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
        }
        button {
            padding: 10px 20px;
            margin-left: 10px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="chat-container" id="chat"></div>

    <div class="input-area">
        <input type="text" id="answer" placeholder="输入你的回答..." />
        <button onclick="sendAnswer()">发送</button>
        <button onclick="finishInterview()">完成访谈</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'init':
                    vscode.postMessage({ command: 'init' });
                    break;
                case 'aiMessage':
                    addAIMessage(message.text);
                    break;
            }
        });

        function addAIMessage(text) {
            const chat = document.getElementById('chat');
            const aiMsg = document.createElement('div');
            aiMsg.className = 'message ai-message';
            aiMsg.innerHTML = '<strong>AI:</strong> ' + text;
            chat.appendChild(aiMsg);
            chat.scrollTop = chat.scrollHeight;
        }

        function sendAnswer() {
            const input = document.getElementById('answer');
            const text = input.value.trim();
            if (!text) return;

            const chat = document.getElementById('chat');
            const userMsg = document.createElement('div');
            userMsg.className = 'message user-message';
            userMsg.innerHTML = '<strong>你:</strong> ' + text;
            chat.appendChild(userMsg);

            vscode.postMessage({
                command: 'answer',
                text: text
            });

            input.value = '';
            chat.scrollTop = chat.scrollHeight;
        }

        function finishInterview() {
            vscode.postMessage({
                command: 'done'
            });
        }

        document.getElementById('answer').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendAnswer();
            }
        });

        // 初始化
        vscode.postMessage({ command: 'init' });
    </script>
</body>
</html>`;
    }
}
