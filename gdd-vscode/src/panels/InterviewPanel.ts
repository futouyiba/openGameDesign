import * as vscode from 'vscode';

export class InterviewPanel {
    public static currentPanel: InterviewPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlContent();

        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'answer':
                        vscode.window.showInformationMessage(`回答: ${message.text}`);
                        return;
                    case 'done':
                        vscode.window.showInformationMessage('访谈完成，开始写作...');
                        this._panel.dispose();
                        return;
                }
            },
            null,
            this._disposables
        );
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
    <div class="chat-container" id="chat">
        <div class="message ai-message">
            <strong>AI:</strong> 你好！我将帮助你创建游戏策划文档。请告诉我，你想创建什么类型的游戏？
        </div>
    </div>

    <div class="input-area">
        <input type="text" id="answer" placeholder="输入你的回答..." />
        <button onclick="sendAnswer()">发送</button>
        <button onclick="finishInterview()">完成访谈</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function sendAnswer() {
            const input = document.getElementById('answer');
            const text = input.value.trim();
            if (!text) return;

            // 显示用户消息
            const chat = document.getElementById('chat');
            const userMsg = document.createElement('div');
            userMsg.className = 'message user-message';
            userMsg.innerHTML = '<strong>你:</strong> ' + text;
            chat.appendChild(userMsg);

            // 发送到扩展
            vscode.postMessage({
                command: 'answer',
                text: text
            });

            input.value = '';

            // 模拟AI回复
            setTimeout(() => {
                const aiMsg = document.createElement('div');
                aiMsg.className = 'message ai-message';
                aiMsg.innerHTML = '<strong>AI:</strong> 很好！请继续描述...';
                chat.appendChild(aiMsg);
                chat.scrollTop = chat.scrollHeight;
            }, 1000);
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
    </script>
</body>
</html>`;
    }
}
