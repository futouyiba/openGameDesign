import * as vscode from 'vscode';
import { Session } from '../core/session';
import { AIClient } from '../utils/ai';
import { LlmSelection } from '../llm/types';
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
        this._panel.webview.html = this._getHtmlContent();

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'init':
                        // Session 已由外部初始化，直接开始访谈
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
                retainContextWhenHidden: true
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
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GDD 访谈</title>
    <style>
        :root {
            --lumina-bg: #18181B;
            --lumina-surface: #1C1C1F;
            --lumina-border: rgba(255, 255, 255, 0.08);
            --lumina-text-primary: #F4F4F5;
            --lumina-text-secondary: #A1A1AA;
            --lumina-accent: #A5F3FC;
            --lumina-error: #FDA4AF;

            --font-interface: 'General Sans', system-ui, -apple-system, sans-serif;
            --font-prose: 'IA Writer Duo', 'Input Sans', 'Menlo', monospace;
        }

        body {
            padding: 40px 20px 140px;
            font-family: var(--font-interface);
            background-color: var(--lumina-bg);
            color: var(--lumina-text-primary);
            line-height: 1.75;
            margin: 0;
        }

        .chat-container {
            max-width: 720px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 3rem;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .message {
            animation: fadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            max-width: 100%;
            position: relative;
        }

        .ai-message {
            background: transparent;
            color: var(--lumina-text-primary);
            font-size: 1.1rem;
            letter-spacing: -0.01em;
        }

        .user-message {
            background: transparent;
            border-left: 2px solid var(--lumina-accent);
            padding-left: 1.5rem;
            margin-top: 1rem;
            margin-bottom: 1rem;
            color: var(--lumina-text-secondary);
            font-family: var(--font-prose);
        }

        .user-message strong, .ai-message strong {
            display: block;
            margin-bottom: 0.5rem;
            font-family: var(--font-interface);
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            opacity: 0.5;
        }

        .ai-message strong {
            color: var(--lumina-accent);
        }

        .user-message strong {
            color: var(--lumina-text-secondary);
        }

        .input-area {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 40px 20px;
            background: linear-gradient(to top, var(--lumina-bg) 80%, transparent);
            display: flex;
            justify-content: center;
            z-index: 10;
        }

        .input-wrapper {
            max-width: 720px;
            width: 100%;
            background: var(--lumina-surface);
            border: 1px solid var(--lumina-border);
            border-radius: 12px;
            box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5);
            padding: 16px;
            display: flex;
            gap: 16px;
            align-items: flex-end;
            transition: border-color 0.2s ease;
        }

        .input-wrapper:focus-within {
            border-color: rgba(165, 243, 252, 0.2);
        }

        textarea {
            flex: 1;
            min-height: 24px;
            max-height: 300px;
            padding: 4px;
            background: transparent;
            color: var(--lumina-text-primary);
            border: none;
            resize: none;
            font-family: var(--font-prose);
            font-size: 1rem;
            line-height: 1.6;
            outline: none;
        }

        textarea::placeholder {
            color: var(--lumina-text-secondary);
            opacity: 0.3;
        }

        .buttons-area {
            display: flex;
            gap: 8px;
        }

        .mic-button {
            width: 32px;
            height: 32px;
            background: transparent;
            color: var(--lumina-text-secondary);
            border: 1px solid transparent;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .mic-button:hover {
            background: rgba(255,255,255,0.05);
            color: var(--lumina-text-primary);
        }

        .mic-button.recording {
            color: var(--lumina-error);
            background: rgba(253, 164, 175, 0.1);
            animation: pulse 2s infinite;
        }

        button#sendButton {
            padding: 8px 20px;
            background: var(--lumina-text-primary);
            color: var(--lumina-bg);
            border: none;
            border-radius: 6px;
            font-family: var(--font-interface);
            font-weight: 500;
            font-size: 0.9rem;
            cursor: pointer;
            height: 36px;
            transition: opacity 0.2s ease;
        }

        button#sendButton:hover {
            opacity: 0.9;
        }

        button#finishButton {
            position: fixed;
            top: 24px;
            right: 24px;
            background: rgba(255,255,255,0.03);
            color: var(--lumina-text-secondary);
            border: 1px solid var(--lumina-border);
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s ease;
            backdrop-filter: blur(4px);
        }

        button#finishButton:hover {
            background: var(--lumina-surface);
            color: var(--lumina-text-primary);
            border-color: rgba(255,255,255,0.15);
        }

        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(253, 164, 175, 0.4); }
            70% { box-shadow: 0 0 0 6px rgba(253, 164, 175, 0); }
            100% { box-shadow: 0 0 0 0 rgba(253, 164, 175, 0); }
        }
    </style>
</head>
<body>
    <button id="finishButton">完成访谈 / Finish Interview</button>

    <div class="chat-container" id="chat"></div>

    <div class="input-area">
        <div class="input-wrapper">
            <button class="mic-button" id="micButton" title="语音输入 (Whisper)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            </button>
            <textarea id="answer" placeholder="Type your answer... (Shift+Enter for new line)"></textarea>
            <div class="buttons-area">
                <button id="sendButton">Send</button>
            </div>
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
                    const textarea = document.getElementById('answer');
                    textarea.value += message.text;
                    textarea.scrollTop = textarea.scrollHeight; // Auto-scroll to bottom
                    break;
            }
        });

        function addAIMessage(text) {
            const chat = document.getElementById('chat');
            const aiMsg = document.createElement('div');
            aiMsg.className = 'message ai-message';
            aiMsg.innerHTML = '<strong>AI</strong>' + text; // Removed "AI:" prefix for cleaner look
            chat.appendChild(aiMsg);
            setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
        }

        function displayUserMessage(text) {
            const chat = document.getElementById('chat');
            const userMsg = document.createElement('div');
            userMsg.className = 'message user-message';
            userMsg.innerHTML = '<strong>You</strong>' + text.replace(/\n/g, '<br>');
            chat.appendChild(userMsg);
            setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
        }

        function sendAnswer() {
            const input = document.getElementById('answer');
            const text = input.value.trim();
            if (!text) return;

            displayUserMessage(text); // Optimistic UI update

            vscode.postMessage({
                command: 'answer',
                text: text
            });

            input.value = '';
            // Reset height
            input.style.height = 'auto'; 
        }

        // Auto-resize textarea
        const textarea = document.getElementById('answer');
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

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
                    alert('Microphone access denied: ' + err.message);
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

        // Init
        vscode.postMessage({ command: 'init' });
    </script>
</body>
</html>`;
    }
}
