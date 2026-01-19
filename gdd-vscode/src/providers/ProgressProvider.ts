import * as vscode from 'vscode';

type Phase = 'interview' | 'writing' | 'reviewing';
type Status = 'pending' | 'in_progress' | 'completed';

export class ProgressProvider implements vscode.TreeDataProvider<ProgressItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProgressItem | undefined | null | void> = new vscode.EventEmitter<ProgressItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProgressItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private phases: Map<Phase, Status> = new Map([
        ['interview', 'pending'],
        ['writing', 'pending'],
        ['reviewing', 'pending']
    ]);

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    updatePhase(phase: Phase, status: Status): void {
        this.phases.set(phase, status);
        this.refresh();
    }

    getTreeItem(element: ProgressItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ProgressItem): Thenable<ProgressItem[]> {
        if (!element) {
            return Promise.resolve([
                new ProgressItem('访谈阶段', this.phases.get('interview')!),
                new ProgressItem('写作阶段', this.phases.get('writing')!),
                new ProgressItem('审阅阶段', this.phases.get('reviewing')!)
            ]);
        }
        return Promise.resolve([]);
    }
}

class ProgressItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly status: Status
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);

        const icons: Record<Status, string> = {
            'pending': '⏸',
            'in_progress': '⏳',
            'completed': '✓'
        };

        this.description = icons[status];

        // 设置图标颜色
        if (status === 'completed') {
            this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
        } else if (status === 'in_progress') {
            this.iconPath = new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('testing.iconQueued'));
        }
    }
}
