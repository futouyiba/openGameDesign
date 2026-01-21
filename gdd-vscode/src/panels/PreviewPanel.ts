import * as vscode from 'vscode';
import * as path from 'path';

export class PreviewPanel {
    public static currentPanel: PreviewPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private documentPath: string;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, documentPath: string) {
        this._panel = panel;
        this.documentPath = documentPath;

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this.update();

        // 监听文档变化
        const watcher = vscode.workspace.createFileSystemWatcher(documentPath);
        watcher.onDidChange(() => this.update());
        this._disposables.push(watcher);
    }

    private async update() {
        const content = await vscode.workspace.fs.readFile(vscode.Uri.file(this.documentPath));
        const markdown = content.toString();
        this._panel.webview.html = this._getHtmlContent(markdown);
    }

    public static async render(extensionUri: vscode.Uri, documentPath: string) {
        if (PreviewPanel.currentPanel) {
            PreviewPanel.currentPanel._panel.reveal(vscode.ViewColumn.Two);
        } else {
            const panel = vscode.window.createWebviewPanel(
                'gddPreview',
                'GDD 预览',
                vscode.ViewColumn.Two,
                {
                    enableScripts: true
                }
            );

            PreviewPanel.currentPanel = new PreviewPanel(panel, extensionUri, documentPath);
        }
    }

    public dispose() {
        PreviewPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private _getHtmlContent(markdown: string): string {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GDD 预览</title>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        :root {
            --lumina-bg: #18181B;
            --lumina-text-primary: #F4F4F5;
            --lumina-text-secondary: #A1A1AA;
            --lumina-border: rgba(255, 255, 255, 0.08);
            --font-display: 'Cabinet Grotesk', system-ui, sans-serif;
            --font-body: 'General Sans', system-ui, sans-serif;
            --font-mono: 'IA Writer Duo', 'Input Sans', monospace;
        }

        body {
            padding: 60px 40px;
            max-width: 800px;
            margin: 0 auto;
            font-family: var(--font-body);
            color: var(--lumina-text-primary);
            background: var(--lumina-bg);
            line-height: 1.8;
            -webkit-font-smoothing: antialiased;
        }

        h1, h2, h3, h4 {
            font-family: var(--font-display);
            color: var(--lumina-text-primary);
            font-weight: 600;
            margin-top: 2.5em;
            margin-bottom: 1em;
            letter-spacing: -0.02em;
        }

        h1 {
            font-size: 2.5rem;
            border-bottom: 1px solid var(--lumina-border);
            padding-bottom: 0.5em;
        }

        h2 { font-size: 1.75rem; }

        p {
            margin-bottom: 1.5em;
            color: rgba(244, 244, 245, 0.9);
        }

        code {
            font-family: var(--font-mono);
            background: rgba(255, 255, 255, 0.06);
            color: #A5F3FC;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9em;
        }

        pre {
            background: #121214;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid var(--lumina-border);
            overflow-x: auto;
            margin: 2em 0;
        }

        pre code {
            background: transparent;
            padding: 0;
            color: var(--lumina-text-secondary);
        }

        blockquote {
            border-left: 2px solid var(--lumina-text-secondary);
            margin: 2em 0;
            padding-left: 1.5em;
            color: var(--lumina-text-secondary);
            font-style: italic;
        }

        .mermaid {
            background: transparent;
            padding: 24px;
            border: 1px solid var(--lumina-border);
            border-radius: 8px;
            margin: 2em 0;
            display: flex;
            justify-content: center;
        }

        .mermaid text {
            fill: #F4F4F5 !important;
        }
    </style>
</head>
<body>
    <div id="content"></div>
    <script>
        mermaid.initialize({ startOnLoad: false, theme: 'default' });

        const markdown = ${JSON.stringify(markdown)};

        // 解析Markdown
        const renderer = new marked.Renderer();
        renderer.code = function(code, language) {
            if (language === 'mermaid') {
                return '<div class="mermaid">' + code + '</div>';
            }
            return '<pre><code>' + code + '</code></pre>';
        };

        marked.setOptions({ renderer: renderer });
        document.getElementById('content').innerHTML = marked.parse(markdown);

        // 渲染Mermaid
        mermaid.run();
    </script>
</body>
</html>`;
    }
}
