import * as vscode from 'vscode';
import { Session } from '../core/session';

export class CommentController {
    private commentController: vscode.CommentController;
    private session: Session;

    constructor(session: Session) {
        this.session = session;
        this.commentController = vscode.comments.createCommentController(
            'gdd-comments',
            'GDD Comments'
        );
        this.commentController.commentingRangeProvider = {
            provideCommentingRanges: (document: vscode.TextDocument) => {
                // 只在 markdown 文档中启用评论
                if (document.languageId === 'markdown') {
                    return [new vscode.Range(0, 0, document.lineCount - 1, 0)];
                }
                return [];
            }
        };
    }

    async addComment(
        document: vscode.TextDocument,
        range: vscode.Range,
        text: string
    ): Promise<void> {
        const thread = this.commentController.createCommentThread(
            document.uri,
            range,
            []
        );

        const comment: vscode.Comment = {
            body: text,
            mode: vscode.CommentMode.Preview,
            author: { name: 'User' }
        };
        thread.comments = [comment];
        thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;

        // 保存到 Mail 系统
        await this.session.mailSystem.sendMail({
            type: 'comment',
            priority: 'normal',
            from: 'user',
            content: `评论: ${text}`,
            comments: [{
                range: {
                    file: document.uri.fsPath,
                    startLine: range.start.line,
                    endLine: range.end.line,
                    text: document.getText(range)
                },
                content: text,
                resolved: false
            }]
        });
    }

    dispose() {
        this.commentController.dispose();
    }
}
