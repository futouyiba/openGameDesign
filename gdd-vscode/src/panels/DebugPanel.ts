import * as vscode from 'vscode';
import { DebugService, DebugEvent } from '../core/debugService';
import { log } from '../utils/logger';

export class DebugPanel {
    public static currentPanel: DebugPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private debugService: DebugService;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this.debugService = DebugService.getInstance();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.html = this._getHtmlContent(this._panel.webview);

        // Send existing logs
        this.sendLogs(this.debugService.getBuffer());

        // Listen for new logs
        this.debugService.onDebugEvent(event => {
            this.sendLogs([event]);
        }, null, this._disposables);
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        // If we already have a panel, show it.
        if (DebugPanel.currentPanel) {
            DebugPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            'gddDebug',
            'GDD Debug',
            vscode.ViewColumn.Beside, // Open side-by-side by default
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        DebugPanel.currentPanel = new DebugPanel(panel, extensionUri);
    }

    public dispose() {
        DebugPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private sendLogs(events: DebugEvent[]) {
        this._panel.webview.postMessage({ command: 'logs', events });
    }

    private _getHtmlContent(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GDD Debug Panel</title>
    <style>
        body { font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size); color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); padding: 0; margin: 0; }
        .log-container { padding: 10px; display: flex; flex-direction: column; gap: 8px; }
        .log-entry { border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 8px; font-family: monospace; }
        .log-header { display: flex; justify-content: space-between; margin-bottom: 4px; color: var(--vscode-descriptionForeground); font-size: 0.9em; }
        .log-source { font-weight: bold; color: var(--vscode-symbolIcon-classForeground); }
        .log-type { padding: 2px 6px; border-radius: 4px; font-size: 0.8em; text-transform: uppercase; }
        .type-info { background-color: var(--vscode-debugIcon-startForeground); color: white; }
        .type-warn { background-color: var(--vscode-debugIcon-pauseForeground); color: black; }
        .type-error { background-color: var(--vscode-debugIcon-stopForeground); color: white; }
        .type-llm-req { background-color: #007acc; color: white; }
        .type-llm-res { background-color: #009933; color: white; }
        .type-context { background-color: #cc6600; color: white; }
        .log-message { white-space: pre-wrap; word-break: break-all; }
        .log-data { background-color: var(--vscode-textBlockQuote-background); padding: 8px; margin-top: 4px; border-radius: 4px; overflow-x: auto; display: none; }
        .log-data.visible { display: block; }
        .toggle-btn { cursor: pointer; color: var(--vscode-textLink-foreground); text-decoration: underline; font-size: 0.9em; margin-left: 8px; }
    </style>
</head>
<body>
    <div class="log-container" id="logContainer"></div>
    <script>
        const vscode = acquireVsCodeApi();
        const container = document.getElementById('logContainer');

        function formatTime(ts) {
            return new Date(ts).toLocaleTimeString();
        }

        function createLogEntry(event) {
            const div = document.createElement('div');
            div.className = 'log-entry';
            
            const header = document.createElement('div');
            header.className = 'log-header';
            header.innerHTML = \`
                <span><span class="log-type type-\${event.type}">\${event.type}</span> <span class="log-source">\${event.source}</span></span>
                <span>\${formatTime(event.timestamp)}</span>
            \`;

            const msg = document.createElement('div');
            msg.className = 'log-message';
            msg.textContent = event.message;

            div.appendChild(header);
            div.appendChild(msg);

            if (event.data) {
                const toggle = document.createElement('span');
                toggle.className = 'toggle-btn';
                toggle.textContent = 'Toggle Data';
                toggle.onclick = () => {
                   const dataEl = div.querySelector('.log-data');
                   dataEl.classList.toggle('visible');
                };
                header.querySelector('span').appendChild(toggle);

                const data = document.createElement('div');
                data.className = 'log-data';
                data.textContent = JSON.stringify(event.data, null, 2);
                div.appendChild(data);
            }

            return div;
        }

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'logs') {
                message.events.forEach(e => {
                    const el = createLogEntry(e);
                    // Prepend to show newest first? Or append? Usually logs are appended.
                    // Let's prepend safely to avoid scrolling issues for now, or just append.
                    // Let's append and scroll to bottom.
                    container.appendChild(el);
                    window.scrollTo(0, document.body.scrollHeight);
                });
            }
        });
    </script>
</body>
</html>`;
    }
}
