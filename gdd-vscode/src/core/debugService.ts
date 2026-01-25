import * as vscode from 'vscode';

export interface DebugEvent {
    type: 'info' | 'warn' | 'error' | 'llm-req' | 'llm-res' | 'context' | 'system';
    timestamp: number;
    source: string;
    message: string;
    data?: any;
}

export class DebugService {
    private static instance: DebugService;
    private _onDebugEvent = new vscode.EventEmitter<DebugEvent>();
    public readonly onDebugEvent = this._onDebugEvent.event;
    private buffer: DebugEvent[] = [];
    private readonly MAX_BUFFER_SIZE = 1000;

    private constructor() { }

    public static getInstance(): DebugService {
        if (!DebugService.instance) {
            DebugService.instance = new DebugService();
        }
        return DebugService.instance;
    }

    public log(type: DebugEvent['type'], source: string, message: string, data?: any) {
        const event: DebugEvent = {
            type,
            timestamp: Date.now(),
            source,
            message,
            data
        };

        this.buffer.push(event);
        if (this.buffer.length > this.MAX_BUFFER_SIZE) {
            this.buffer.shift();
        }

        this._onDebugEvent.fire(event);
    }

    public getBuffer(): DebugEvent[] {
        return [...this.buffer];
    }

    public clear() {
        this.buffer = [];
        this.log('system', 'DebugService', 'Logs cleared');
    }
}
