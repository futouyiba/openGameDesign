import * as vscode from 'vscode';
import { ProgressWebviewProvider } from './providers/ProgressWebviewProvider';
import { MailProvider } from './providers/MailProvider';
import { Session } from './core/session';
import { resolveLlmSelection, getGlobalLlmSelection } from './llm/selection';
import { setProgressProvider } from './agents/writer';
import { CommentController } from './comments/CommentController';
import { log } from './utils/logger';

// Commands
import { startInterviewCommand } from './commands/startInterview';
import { startWritingCommand } from './commands/startWriting';
import { sendMailCommand } from './commands/sendMail';
import { addCommentCommand, disposeCommentController } from './commands/addComment';
import { previewCommand } from './commands/preview';
import { enableWriterModeCommand, disableWriterModeCommand } from './commands/writerMode';
import { DebugPanel } from './panels/DebugPanel';

let progressProvider: ProgressWebviewProvider;
let mailProvider: MailProvider;
let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {
    log('GDD Assistant activating');

    // Status Bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'gdd.switchModel';
    statusBarItem.text = '$(sparkle) GDD: Initializing...';
    context.subscriptions.push(statusBarItem);
    statusBarItem.show();
    updateStatusBar(context).catch(err => console.error('Failed to update status bar:', err));

    // Providers
    progressProvider = new ProgressWebviewProvider(context.extensionUri);
    mailProvider = new MailProvider();
    setProgressProvider(progressProvider);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ProgressWebviewProvider.viewType, progressProvider),
        vscode.window.registerTreeDataProvider('gdd-mails', mailProvider)
    );

    // Helpers
    const getSession = (root?: string) => {
        const workspaceRoot = root || vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) throw new Error('请先打开一个工作区');
        const session = new Session(workspaceRoot);
        return session;
    };

    // Register Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('gdd.start', async () => {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('请先打开一个工作区');
                return;
            }
            const session = new Session(workspaceRoot);
            await session.init();

            // Check if resuming interview
            const state = session.getState();
            if (state.phase === 'interview') {
                // Update status bar for resume
                await updateStatusBar(context);
            } else {
                // New interview setup (output dir)
                const outputDir = await vscode.window.showInputBox({
                    prompt: '输入文档输出目录（相对于工作区根目录）',
                    value: 'docs',
                    placeHolder: 'docs'
                });
                if (!outputDir) return;
                state.outputDir = outputDir;
                await session.saveState();
            }

            await startInterviewCommand(context, session, () => resolveLlmSelection(context, session));
            progressProvider.updatePhase('interview', 'in_progress');
            await updateStatusBar(context);
        }),

        vscode.commands.registerCommand('gdd.startWriting', async () => {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!workspaceRoot) return;
            const session = new Session(workspaceRoot);
            await session.init();

            progressProvider.updatePhase('writing', 'in_progress');

            // Wrap updateState for command
            const updateState = async (key: string, value: any) => { /* simplified, writer mode logic inside command usually handles UI */ };

            await startWritingCommand(context, session, () => resolveLlmSelection(context, session), updateState as any);

            // Post-writing updates
            progressProvider.updatePhase('writing', 'completed');
            progressProvider.updatePhase('reviewing', 'in_progress');
        }),

        vscode.commands.registerCommand('gdd.sendMail', () => sendMailCommand(context, mailProvider)),
        vscode.commands.registerCommand('gdd.addComment', () => addCommentCommand(context)),
        vscode.commands.registerCommand('gdd.preview', () => previewCommand(context)),
        vscode.commands.registerCommand('gdd.enableWriterMode', () => enableWriterModeCommand(context)),
        vscode.commands.registerCommand('gdd.disableWriterMode', () => disableWriterModeCommand(context)),

        vscode.commands.registerCommand('gdd.switchModel', async () => {
            const selection = await resolveLlmSelection(context);
            if (selection) {
                await updateStatusBar(context);
            }
        }),

        vscode.commands.registerCommand('gdd.showDebugPanel', () => {
            DebugPanel.createOrShow(context.extensionUri);
        })
    );

    log('GDD Assistant activated');
}

async function updateStatusBar(context: vscode.ExtensionContext) {
    const selection = await getGlobalLlmSelection(context);
    const modelLabel = selection ? selection.modelId : 'Select LLM';
    statusBarItem.text = `$(sparkle) GDD: ${modelLabel}`;
    statusBarItem.tooltip = 'Click to switch LLM model';
}

export function deactivate() {
    disposeCommentController();
}
