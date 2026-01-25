import * as vscode from 'vscode';
import { Session } from '../core/session';
import { CommentController } from '../comments/CommentController';

let globalCommentController: CommentController | undefined;

export async function addCommentCommand(context: vscode.ExtensionContext) {
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

        // Note: For refactoring, ideally CommentController is a singleton or managed service.
        // Here we use a module-level variable to mimic extension-level scope if needed, 
        // or re-instantiate if that's acceptable. Original used extension's 'commentController'.
        // If we want extension state, we should pass it or use a service.
        // For simplicity:
        if (!globalCommentController) {
            globalCommentController = new CommentController(session);
        }

        await globalCommentController.addComment(
            editor.document,
            new vscode.Range(selection.start, selection.end),
            comment
        );

        vscode.window.showInformationMessage('评论已添加');
    }
}

export function disposeCommentController() {
    if (globalCommentController) {
        globalCommentController.dispose();
    }
}
