import * as vscode from 'vscode';
import { Session } from '../core/session';
import { AIClient } from '../utils/ai';
import OpenAI from 'openai';
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
                        await this.initializeInterview();
                        return;
                    case 'answer':
                        await this.handleUserAnswer(message.text);
                        return;
                    case 'transcribe':
                        await this.handleTranscription(message.audio);
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

    private async initializeInterview() {
        const state = this.session.getState();
        const history = this.session.getConversationHistory();

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
            await this.sendAIMessage('你好！我将帮助你创建游戏策划文档。请告诉我，你想创建什么类型的游戏？');
        }

        this.conversationHistory = history;
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

            const response = await this.ai.chat(messages, systemPrompt);

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

    public static render(extensionUri: vscode.Uri) {
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
                retainContextWhenHidden: true
            }
        );

        InterviewPanel.currentPanel = new InterviewPanel(panel, extensionUri);
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
        .input-container {
            display: flex;
            gap: 10px;
            align-items: flex-start;
        }
        textarea {
            flex: 1;
            min-height: 80px;
            padding: 10px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            resize: vertical;
            font-family: var(--vscode-font-family);
        }
        .mic-button {
            width: 40px;
            height: 40px;
            padding: 0;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .mic-button.recording {
            background: #f14c4c;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }
        button {
            padding: 10px 20px;
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
        <div class="input-container">
            <button class="mic-button" id="micButton" title="语音输入 (Whisper)">🎤</button>
            <textarea id="answer" placeholder="输入你的回答...&#10;支持多行输入，Shift+Enter换行，Enter发送"></textarea>
        </div>
        <div style="margin-top: 10px;">
            <button id="sendButton">发送</button>
            <button id="finishButton">完成访谈</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let mediaRecorder;
        let audioChunks = [];

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'aiMessage':
                    addAIMessage(message.text);
                    break;
                case 'displayUserMessage':
                    displayUserMessage(message.text);
                    break;
                case 'transcription':
                    document.getElementById('answer').value += message.text;
                    break;
            }
        });

        function addAIMessage(text) {
            const chat = document.getElementById('chat');
            const aiMsg = document.createElement('div');
            aiMsg.className = 'message ai-message';
            aiMsg.innerHTML = '<strong>AI:</strong> ' + text;
            chat.appendChild(aiMsg);
            setTimeout(() => chat.scrollTop = chat.scrollHeight, 100);
        }

        function displayUserMessage(text) {
            const chat = document.getElementById('chat');
            const userMsg = document.createElement('div');
            userMsg.className = 'message user-message';
            userMsg.innerHTML = '<strong>你:</strong> ' + text.replace(/\n/g, '<br>');
            chat.appendChild(userMsg);
            setTimeout(() => chat.scrollTop = chat.scrollHeight, 100);
        }

        function sendAnswer() {
            const input = document.getElementById('answer');
            const text = input.value.trim();
            if (!text) return;

            const chat = document.getElementById('chat');
            const userMsg = document.createElement('div');
            userMsg.className = 'message user-message';
            userMsg.innerHTML = '<strong>你:</strong> ' + text.replace(/\n/g, '<br>');
            chat.appendChild(userMsg);

            vscode.postMessage({
                command: 'answer',
                text: text
            });

            input.value = '';
            setTimeout(() => chat.scrollTop = chat.scrollHeight, 100);
        }

        async function toggleRecording() {
            const micButton = document.getElementById('micButton');

            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                micButton.classList.remove('recording');
            } else {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];

                    mediaRecorder.ondataavailable = (event) => {
                        audioChunks.push(event.data);
                    };

                    mediaRecorder.onstop = async () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            vscode.postMessage({
                                command: 'transcribe',
                                audio: reader.result
                            });
                        };
                        reader.readAsDataURL(audioBlob);
                        stream.getTracks().forEach(track => track.stop());
                    };

                    mediaRecorder.start();
                    micButton.classList.add('recording');
                } catch (err) {
                    alert('无法访问麦克风: ' + err.message);
                }
            }
        }

        function finishInterview() {
            vscode.postMessage({
                command: 'done'
            });
        }

        document.getElementById('answer').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAnswer();
            }
        });

        document.getElementById('sendButton').addEventListener('click', sendAnswer);
        document.getElementById('finishButton').addEventListener('click', finishInterview);
        document.getElementById('micButton').addEventListener('click', toggleRecording);

        // 初始化
        vscode.postMessage({ command: 'init' });
    </script>
</body>
</html>`;
    }
}
