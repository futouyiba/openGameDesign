import * as vscode from 'vscode';
import { InterviewPanel } from './panels/InterviewPanel';
import { PreviewPanel } from './panels/PreviewPanel';
import { ProgressProvider } from './providers/ProgressProvider';
import { MailProvider } from './providers/MailProvider';
import { Session } from './core/session';
import { AIClient } from './utils/ai';
import { WriterAgent } from './agents/writer';

let progressProvider: ProgressProvider;
let mailProvider: MailProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('GDD Assistant is now active');

    // 初始化providers
    progressProvider = new ProgressProvider();
    mailProvider = new MailProvider();

    // 注册命令
    const startCommand = vscode.commands.registerCommand('gdd.start', () => {
        progressProvider.updatePhase('interview', 'in_progress');
        InterviewPanel.render(context.extensionUri);
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

        const ai = new AIClient();
        const writer = new WriterAgent(session, ai);

        await writer.start();

        progressProvider.updatePhase('writing', 'completed');
        progressProvider.updatePhase('reviewing', 'pending');

        // 打开预览
        const docPath = require('path').join(workspaceRoot, 'game-design-document.md');
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
                content
            });
        }

        vscode.window.showInformationMessage(`邮件已发送: [${priority}] ${content}`);
    });

    const previewCommand = vscode.commands.registerCommand('gdd.preview', async () => {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('请先打开一个工作区');
            return;
        }

        const docPath = require('path').join(workspaceRoot, 'game-design-document.md');
        PreviewPanel.render(context.extensionUri, docPath);
    });

    // 注册侧边栏视图
    vscode.window.registerTreeDataProvider('gdd-progress', progressProvider);
    vscode.window.registerTreeDataProvider('gdd-mails', mailProvider);

    context.subscriptions.push(
        startCommand,
        startWritingCommand,
        sendMailCommand,
        previewCommand
    );
}

export function deactivate() {}
