import * as vscode from 'vscode';
import { MailProvider } from '../providers/MailProvider';
import { Session } from '../core/session';

export async function sendMailCommand(context: vscode.ExtensionContext, mailProvider: MailProvider) {
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

    // 保存到文件 (Session logic)
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
}
