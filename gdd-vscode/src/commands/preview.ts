import * as vscode from 'vscode';
import { Session } from '../core/session';
import { PreviewPanel } from '../panels/PreviewPanel';
import * as path from 'path';

export async function previewCommand(context: vscode.ExtensionContext) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('请先打开一个工作区');
        return;
    }

    const session = new Session(workspaceRoot);
    await session.init();
    const state = session.getState();
    const outputDir = state.outputDir || 'docs';

    const docPath = path.join(workspaceRoot, outputDir, 'game-design-document.md');
    PreviewPanel.render(context.extensionUri, docPath);
}
