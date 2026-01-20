import * as vscode from 'vscode';

type Phase = 'interview' | 'writing' | 'reviewing';
type Status = 'pending' | 'in_progress' | 'completed';

interface ProgressDetail {
    phase: Phase;
    status: Status;
    detail?: string;
    sections?: SectionProgress[];
}

interface SectionProgress {
    title: string;
    status: Status;
}

export class ProgressProvider implements vscode.TreeDataProvider<ProgressItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProgressItem | undefined | null | void> = new vscode.EventEmitter<ProgressItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProgressItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private progress: Map<Phase, ProgressDetail> = new Map([
        ['interview', { phase: 'interview', status: 'pending' }],
        ['writing', { phase: 'writing', status: 'pending' }],
        ['reviewing', { phase: 'reviewing', status: 'pending' }]
    ]);

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    updatePhase(phase: Phase, status: Status, detail?: string): void {
        this.progress.set(phase, { phase, status, detail });
        this.refresh();
    }

    updateSections(sections: SectionProgress[]): void {
        const writing = this.progress.get('writing')!;
        writing.sections = sections;
        this.refresh();
    }

    getTreeItem(element: ProgressItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ProgressItem): Thenable<ProgressItem[]> {
        if (!element) {
            const interview = this.progress.get('interview')!;
            const writing = this.progress.get('writing')!;
            const reviewing = this.progress.get('reviewing')!;

            return Promise.resolve([
                new ProgressItem('访谈阶段', interview.status, interview.detail, 'interview'),
                new ProgressItem('写作阶段', writing.status, writing.detail, 'writing', writing.sections),
                new ProgressItem('审阅阶段', reviewing.status, reviewing.detail, 'reviewing')
            ]);
        }

        // 展开写作阶段显示章节
        if (element.phase === 'writing' && element.sections) {
            return Promise.resolve(
                element.sections.map(s => new ProgressItem(s.title, s.status, undefined, 'section'))
            );
        }

        return Promise.resolve([]);
    }
}

class ProgressItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly status: Status,
        public readonly detail?: string,
        public readonly phase?: string,
        public readonly sections?: SectionProgress[]
    ) {
        super(
            label,
            sections && sections.length > 0
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None
        );

        const icons: Record<Status, string> = {
            'pending': '⏸',
            'in_progress': '⏳',
            'completed': '✓'
        };

        this.description = detail || icons[status];

        if (status === 'completed') {
            this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
        } else if (status === 'in_progress') {
            this.iconPath = new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('testing.iconQueued'));
        }
    }
}
