import * as vscode from 'vscode';

export class MailProvider implements vscode.TreeDataProvider<MailItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<MailItem | undefined | null | void> = new vscode.EventEmitter<MailItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MailItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private mails: MailItem[] = [];

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    addMail(type: string, priority: string, content: string): void {
        this.mails.push(new MailItem(type, priority, content));
        this.refresh();
    }

    getTreeItem(element: MailItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: MailItem): Thenable<MailItem[]> {
        if (!element) {
            return Promise.resolve(this.mails);
        }
        return Promise.resolve([]);
    }
}

class MailItem extends vscode.TreeItem {
    constructor(
        public readonly type: string,
        public readonly priority: string,
        public readonly content: string
    ) {
        super(content, vscode.TreeItemCollapsibleState.None);
        this.description = `[${priority}] ${type}`;
        this.tooltip = content;
    }
}
