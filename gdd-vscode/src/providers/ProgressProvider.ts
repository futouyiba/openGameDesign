import * as vscode from 'vscode';

export class ProgressProvider implements vscode.TreeDataProvider<ProgressItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProgressItem | undefined | null | void> = new vscode.EventEmitter<ProgressItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProgressItem | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ProgressItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ProgressItem): Thenable<ProgressItem[]> {
        if (!element) {
            return Promise.resolve([
                new ProgressItem('访谈阶段', vscode.TreeItemCollapsibleState.None, '✓'),
                new ProgressItem('写作阶段', vscode.TreeItemCollapsibleState.None, '⏳'),
                new ProgressItem('审阅阶段', vscode.TreeItemCollapsibleState.None, '⏸')
            ]);
        }
        return Promise.resolve([]);
    }
}

class ProgressItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly status: string
    ) {
        super(label, collapsibleState);
        this.description = status;
    }
}
