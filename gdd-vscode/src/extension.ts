import * as vscode from 'vscode';
import { InterviewPanel } from './panels/InterviewPanel';
import { PreviewPanel } from './panels/PreviewPanel';
import { ProgressProvider } from './providers/ProgressProvider';
import { MailProvider } from './providers/MailProvider';
import { Session } from './core/session';
import { AIClient } from './utils/ai';
import { WriterAgent, setProgressProvider } from './agents/writer';
import { ReviewerAgent } from './agents/reviewer';
import { CommentController } from './comments/CommentController';

let progressProvider: ProgressProvider;
let mailProvider: MailProvider;
let commentController: CommentController | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('GDD Assistant is now active');

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
            InterviewPanel.render(context.extensionUri);
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

    // 注册侧边栏视图
    vscode.window.registerTreeDataProvider('gdd-progress', progressProvider);
    vscode.window.registerTreeDataProvider('gdd-mails', mailProvider);

    context.subscriptions.push(
        startCommand,
        startWritingCommand,
        sendMailCommand,
        addCommentCommand,
        previewCommand
    );
}

export function deactivate() {
    if (commentController) {
        commentController.dispose();
    }
}
