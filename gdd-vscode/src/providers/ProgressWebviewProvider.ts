import * as vscode from 'vscode';
import * as path from 'path';

export class ProgressWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'gdd-progress';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'startInterview': {
                    vscode.commands.executeCommand('gdd.start');
                    break;
                }
                case 'startWriting': {
                    vscode.commands.executeCommand('gdd.startWriting');
                    break;
                }
                case 'startReview': {
                    // Placeholder for future review command
                    vscode.window.showInformationMessage('Review feature coming soon!');
                    break;
                }
            }
        });
    }

    public updatePhase(phase: 'interview' | 'writing' | 'reviewing', status: string, detail?: string) {
        this.updateProgress(phase, status, detail);
    }

    public updateSections(sections: { title: string; status: string }[]) {
        const total = sections.length;
        const completed = sections.filter(s => s.status === 'completed').length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Update progress bar in UI
        this.updateProgress('writing', 'in_progress', `${percentage}%`);
    }

    public updateProgress(phase: 'interview' | 'writing' | 'reviewing', status: string, detail?: string) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'updateProgress', phase, status, detail });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const interviewIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'interview.png'));
        const writingIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'writing.png'));
        const reviewIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'review.png'));

        const nonce = getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>GDD Progress</title>
            <style>
                :root {
                    --container-paddding: 20px;
                    --input-padding-vertical: 6px;
                    --input-padding-horizontal: 4px;
                    --input-margin-vertical: 4px;
                    --input-margin-horizontal: 0;
                }

                body {
                    padding: 0;
                    margin: 0;
                    color: var(--vscode-foreground);
                    font-family: var(--vscode-font-family);
                    background-color: var(--vscode-editor-background);
                }

                .container {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    padding: 16px;
                }

                .card {
                    background: var(--vscode-sideBar-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 8px;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    transition: all 0.2s;
                    cursor: default;
                }

                .card:hover {
                    border-color: var(--vscode-focusBorder);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }

                .card-icon {
                    width: 64px;
                    height: 64px;
                    margin-bottom: 12px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    overflow: hidden;
                    background: transparent;
                }

                /* Image specific styles */
                .img-icon {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    border-radius: 12px;
                }

                .card-title {
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .card-status {
                    font-size: 12px;
                    opacity: 0.8;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: var(--vscode-disabledForeground);
                }
                .status-dot.active { background-color: var(--vscode-charts-yellow); box-shadow: 0 0 8px var(--vscode-charts-yellow); }
                .status-dot.done { background-color: var(--vscode-testing-iconPassed); }

                .action-btn {
                    width: 100%;
                    padding: 10px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .action-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                /* Progress Bar */
                .progress-container {
                    width: 100%;
                    background-color: var(--vscode-progressBar-background);
                    border-radius: 4px;
                    height: 6px;
                    margin-top: 8px;
                    overflow: hidden;
                }

                .progress-bar {
                    height: 100%;
                    background-color: var(--vscode-charts-yellow);
                    width: 0%;
                    transition: width 0.3s ease;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <!-- Interview Phase -->
                <div class="card" id="card-interview">
                    <div class="card-icon">
                        <img src="${interviewIcon}" class="img-icon" alt="Interview" />
                    </div>
                    <div class="card-title">Interview</div>
                    <div class="card-status">
                        <div class="status-dot active"></div>
                        <span id="status-interview">Ready to Start</span>
                    </div>
                    <button class="action-btn" onclick="post('startInterview')">Start Interview</button>
                </div>

                <!-- Writing Phase -->
                <div class="card" id="card-writing">
                    <div class="card-icon">
                        <img src="${writingIcon}" class="img-icon" alt="Writing" />
                    </div>
                    <div class="card-title">Writing</div>
                    <div class="card-status">
                        <div class="status-dot"></div>
                        <span id="status-writing">Pending</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar" id="progress-writing"></div>
                    </div>
                    <button class="action-btn" style="margin-top:12px; opacity:0.7" onclick="post('startWriting')">Generate Draft</button>
                </div>

                <!-- Review Phase -->
                <div class="card" id="card-reviewing">
                    <div class="card-icon">
                        <img src="${reviewIcon}" class="img-icon" alt="Review" />
                    </div>
                    <div class="card-title">Review</div>
                    <div class="card-status">
                        <div class="status-dot"></div>
                        <span id="status-reviewing">Pending</span>
                    </div>
                    <button class="action-btn" style="opacity:0.7" onclick="post('startReview')">Review & Fix</button>
                </div>
            </div>

            <script nonce="${nonce}">
                const vscode = acquireVsCodeApi();

                function post(type) {
                    vscode.postMessage({ type });
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'updateProgress') {
                        // Handle updates
                        const card = document.getElementById('card-' + message.phase);
                        if (card) {
                            const statusText = document.getElementById('status-' + message.phase);
                            if (statusText) statusText.innerText = message.status;
                            
                            // Visual updates based on status
                            if (message.phase === 'writing' && message.detail) {
                                // parse progress if detail contains %
                                // simple mock
                                document.getElementById('progress-writing').style.width = message.detail;
                            }
                        }
                    }
                });
            </script>
        </body>
        </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
