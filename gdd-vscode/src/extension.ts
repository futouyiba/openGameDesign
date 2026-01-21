import * as vscode from 'vscode';
import { InterviewPanel } from './panels/InterviewPanel';
import { PreviewPanel } from './panels/PreviewPanel';
import { ProgressProvider } from './providers/ProgressProvider';
import { MailProvider } from './providers/MailProvider';
import { Session } from './core/session';
import { AIClient } from './utils/ai';
import { resolveLlmSelection, getGlobalLlmSelection } from './llm/selection';
import { WriterAgent, setProgressProvider } from './agents/writer';
import { ReviewerAgent } from './agents/reviewer';
import { CommentController } from './comments/CommentController';

let progressProvider: ProgressProvider;
let mailProvider: MailProvider;
let commentController: CommentController | undefined;
let statusBarItem: vscode.StatusBarItem;

const writerModeSnapshotKey = 'gdd.writerMode.snapshot';
const writerModeEnabledKey = 'gdd.writerMode.enabled';

interface WriterModeSnapshot {
    'workbench.activityBar.visible': boolean | null;
    'workbench.statusBar.visible': boolean | null;
    'editor.minimap.enabled': boolean | null;
    'breadcrumbs.enabled': boolean | null;
    'workbench.colorCustomizations': Record<string, string> | null;
}

function readGlobalValue<T>(config: vscode.WorkspaceConfiguration, key: string): T | null {
    const inspected = config.inspect<T>(key);
    if (!inspected || inspected.globalValue === undefined) {
        return null;
    }
    return inspected.globalValue;
}

function isSettingRegistered(config: vscode.WorkspaceConfiguration, key: string): boolean {
    return config.inspect(key) !== undefined;
}

export async function activate(context: vscode.ExtensionContext) {
    console.log('GDD Assistant is now active');

    // 初始化状态栏
    console.log('Initializing GDD Status Bar');
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'gdd.switchModel';
    statusBarItem.text = '$(sparkle) GDD: Initializing...';
    context.subscriptions.push(statusBarItem);
    statusBarItem.show();

    // 异步更新状态栏内容，不阻塞主线程
    updateStatusBar(context).catch(err => console.error('Failed to update status bar:', err));
    console.log('GDD Status Bar shown');

    // 初始化providers
    progressProvider = new ProgressProvider();
    mailProvider = new MailProvider();

    // 设置全局 progressProvider
    setProgressProvider(progressProvider);

    // 注册命令
    const startCommand = vscode.commands.registerCommand('gdd.start', async () => {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('请先打开一个工作区');
            return;
        }

        const session = new Session(workspaceRoot);
        await session.init();
        const state = session.getState();

        // 如果已经在访谈阶段且有未完成的访谈，直接打开访谈面板
        if (state.phase === 'interview') {
            progressProvider.updatePhase('interview', 'in_progress');
            await resolveLlmSelection(context, session);
            await updateStatusBar(context);
            InterviewPanel.render(context);
            return;
        }

        // 选择输出目录
        const outputDir = await vscode.window.showInputBox({
            prompt: '输入文档输出目录（相对于工作区根目录）',
            value: 'docs',
            placeHolder: 'docs'
        });

        if (!outputDir) return;

        // 保存配置
        state.outputDir = outputDir;
        await session.saveState();

        await resolveLlmSelection(context, session);
        await updateStatusBar(context);
        progressProvider.updatePhase('interview', 'in_progress');
        InterviewPanel.render(context);
    });

    const startWritingCommand = vscode.commands.registerCommand('gdd.startWriting', async () => {
        progressProvider.updatePhase('writing', 'in_progress');

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('请先打开一个工作区');
            return;
        }

        const session = new Session(workspaceRoot);
        await session.init();

        const selection = await resolveLlmSelection(context, session);
        await updateStatusBar(context);
        const ai = new AIClient(context, selection);
        const writer = new WriterAgent(session, ai);

        await writer.start();

        progressProvider.updatePhase('writing', 'completed');
        progressProvider.updatePhase('reviewing', 'in_progress');

        // 审阅阶段
        const state = session.getState();
        const outputDir = state.outputDir || 'docs';
        const docPath = require('path').join(workspaceRoot, outputDir, 'game-design-document.md');
        const reviewer = new ReviewerAgent(session, ai);

        let iteration = 0;
        const maxIterations = 3;

        while (iteration < maxIterations) {
            const result = await reviewer.review(docPath);

            const criticalIssues = result.inline.filter(a => a.severity === 'critical');
            const majorIssues = result.inline.filter(a => a.severity === 'major');

            if (criticalIssues.length === 0 && majorIssues.length === 0) {
                break;
            }

            await reviewer.fixIssues(docPath, [...criticalIssues, ...majorIssues]);
            iteration++;
        }

        progressProvider.updatePhase('reviewing', 'completed');

        // 打开预览
        PreviewPanel.render(context.extensionUri, docPath);
    });

    const sendMailCommand = vscode.commands.registerCommand('gdd.sendMail', async () => {
        const mailType = await vscode.window.showQuickPick(
            ['command', 'opinion', 'comment'],
            { placeHolder: '选择邮件类型' }
        );

        if (!mailType) return;

        const priority = await vscode.window.showQuickPick(
            ['urgent', 'normal', 'low'],
            { placeHolder: '选择优先级' }
        );

        if (!priority) return;

        const content = await vscode.window.showInputBox({
            prompt: '输入邮件内容',
            placeHolder: '邮件内容...'
        });

        if (!content) return;

        // 添加到邮件列表
        mailProvider.addMail(mailType, priority, content);

        // 保存到文件
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (workspaceRoot) {
            const session = new Session(workspaceRoot);
            await session.init();
            await session.mailSystem.sendMail({
                type: mailType as any,
                priority: priority as any,
                from: 'user',
                content
            });
        }

        vscode.window.showInformationMessage(`邮件已发送: [${priority}] ${content}`);
    });

    const addCommentCommand = vscode.commands.registerCommand('gdd.addComment', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('请先打开一个文档');
            return;
        }

        const selection = editor.selection;

        const comment = await vscode.window.showInputBox({
            prompt: '输入评论内容',
            placeHolder: '评论...'
        });

        if (!comment) return;

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (workspaceRoot) {
            const session = new Session(workspaceRoot);
            await session.init();

            if (!commentController) {
                commentController = new CommentController(session);
            }

            await commentController.addComment(
                editor.document,
                new vscode.Range(selection.start, selection.end),
                comment
            );

            vscode.window.showInformationMessage('评论已添加');
        }
    });

    const previewCommand = vscode.commands.registerCommand('gdd.preview', async () => {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('请先打开一个工作区');
            return;
        }

        const session = new Session(workspaceRoot);
        await session.init();
        const state = session.getState();
        const outputDir = state.outputDir || 'docs';

        const docPath = require('path').join(workspaceRoot, outputDir, 'game-design-document.md');
        PreviewPanel.render(context.extensionUri, docPath);
    });

    const enableWriterModeCommand = vscode.commands.registerCommand('gdd.enableWriterMode', async () => {
        const config = vscode.workspace.getConfiguration();
        const isEnabled = context.globalState.get<boolean>(writerModeEnabledKey) === true;
        if (isEnabled) {
            vscode.window.showInformationMessage('Writer Mode is already enabled.');
            return;
        }

        const snapshot: WriterModeSnapshot = {
            'workbench.activityBar.visible': readGlobalValue<boolean>(config, 'workbench.activityBar.visible'),
            'workbench.statusBar.visible': readGlobalValue<boolean>(config, 'workbench.statusBar.visible'),
            'editor.minimap.enabled': readGlobalValue<boolean>(config, 'editor.minimap.enabled'),
            'breadcrumbs.enabled': readGlobalValue<boolean>(config, 'breadcrumbs.enabled'),
            'workbench.colorCustomizations': readGlobalValue<Record<string, string>>(config, 'workbench.colorCustomizations')
        };

        await context.globalState.update(writerModeSnapshotKey, snapshot);
        await context.globalState.update(writerModeEnabledKey, true);

        const luminaTheme: Record<string, string> = {
            "sideBar.background": "#18181B",
            "editor.background": "#18181B",
            "activityBar.background": "#18181B",
            "tab.activeBackground": "#18181B",
            "tab.border": "transparent",
            "editorGroupHeader.tabsBackground": "#18181B",
            "statusBar.background": "#18181B",
            "titleBar.activeBackground": "#18181B",
            "sideBar.border": "#27272A",
            "sideBarSectionHeader.background": "#18181B"
        };

        const updates: Thenable<void>[] = [];
        const queueUpdate = (key: string, value: unknown) => {
            if (isSettingRegistered(config, key)) {
                updates.push(
                    config.update(key, value, vscode.ConfigurationTarget.Global).then(undefined, (error) => {
                        console.warn(`Writer Mode setting update failed for ${key}:`, error);
                    })
                );
            }
        };

        queueUpdate('workbench.activityBar.visible', false);
        queueUpdate('workbench.statusBar.visible', false);
        queueUpdate('editor.minimap.enabled', false);
        queueUpdate('breadcrumbs.enabled', false);
        queueUpdate('workbench.colorCustomizations', luminaTheme);

        await Promise.all(updates);

        vscode.window.showInformationMessage('Writer Mode Enabled: Focused environment active.');
    });

    const disableWriterModeCommand = vscode.commands.registerCommand('gdd.disableWriterMode', async () => {
        const config = vscode.workspace.getConfiguration();
        const snapshot = context.globalState.get<WriterModeSnapshot>(writerModeSnapshotKey);
        if (!snapshot) {
            vscode.window.showInformationMessage('Writer Mode is not enabled.');
            return;
        }

        const restoredColorCustomizations = snapshot['workbench.colorCustomizations'] === null
            ? undefined
            : snapshot['workbench.colorCustomizations'];

        const updates: Thenable<void>[] = [];
        const queueUpdate = (key: string, value: unknown) => {
            if (isSettingRegistered(config, key)) {
                updates.push(
                    config.update(key, value, vscode.ConfigurationTarget.Global).then(undefined, (error) => {
                        console.warn(`Writer Mode setting restore failed for ${key}:`, error);
                    })
                );
            }
        };

        queueUpdate(
            'workbench.activityBar.visible',
            snapshot['workbench.activityBar.visible'] === null ? undefined : snapshot['workbench.activityBar.visible']
        );
        queueUpdate(
            'workbench.statusBar.visible',
            snapshot['workbench.statusBar.visible'] === null ? undefined : snapshot['workbench.statusBar.visible']
        );
        queueUpdate(
            'editor.minimap.enabled',
            snapshot['editor.minimap.enabled'] === null ? undefined : snapshot['editor.minimap.enabled']
        );
        queueUpdate(
            'breadcrumbs.enabled',
            snapshot['breadcrumbs.enabled'] === null ? undefined : snapshot['breadcrumbs.enabled']
        );
        queueUpdate('workbench.colorCustomizations', restoredColorCustomizations);

        await Promise.all(updates);

        await context.globalState.update(writerModeSnapshotKey, undefined);
        await context.globalState.update(writerModeEnabledKey, false);

        vscode.window.showInformationMessage('Writer Mode Disabled: Standard VS Code environment restored.');
    });

    // 注册侧边栏视图
    vscode.window.registerTreeDataProvider('gdd-progress', progressProvider);
    vscode.window.registerTreeDataProvider('gdd-mails', mailProvider);

    context.subscriptions.push(
        startCommand,
        startWritingCommand,
        sendMailCommand,
        addCommentCommand,
        previewCommand,
        enableWriterModeCommand,
        disableWriterModeCommand,
        vscode.commands.registerCommand('gdd.switchModel', async () => {
            await resolveLlmSelection(context);
            await updateStatusBar(context);
        })
    );
}

async function updateStatusBar(context: vscode.ExtensionContext) {
    const selection = await getGlobalLlmSelection(context);
    const modelLabel = selection ? selection.modelId : 'Select LLM';
    statusBarItem.text = `$(sparkle) GDD: ${modelLabel}`;
    statusBarItem.tooltip = 'Click to switch LLM model';
}

export function deactivate() {
    if (commentController) {
        commentController.dispose();
    }
}
