import * as vscode from 'vscode';
import { InterviewPanel } from './panels/InterviewPanel';
import { ProgressProvider } from './providers/ProgressProvider';
import { MailProvider } from './providers/MailProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('GDD Assistant is now active');

    // 注册命令
    const startCommand = vscode.commands.registerCommand('gdd.start', () => {
        InterviewPanel.render(context.extensionUri);
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

        vscode.window.showInformationMessage(`邮件已发送: [${priority}] ${content}`);
    });

    const previewCommand = vscode.commands.registerCommand('gdd.preview', () => {
        vscode.commands.executeCommand('markdown.showPreview');
    });

    // 注册侧边栏视图
    const progressProvider = new ProgressProvider();
    vscode.window.registerTreeDataProvider('gdd-progress', progressProvider);

    const mailProvider = new MailProvider();
    vscode.window.registerTreeDataProvider('gdd-mails', mailProvider);

    context.subscriptions.push(
        startCommand,
        sendMailCommand,
        previewCommand
    );
}

export function deactivate() {}
