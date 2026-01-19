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
        body {
            padding: 20px;
            max-width: 900px;
            margin: 0 auto;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
        }
        h1, h2, h3 { color: var(--vscode-editor-foreground); }
        code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
        }
        pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
        .mermaid {
            background: white;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
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
