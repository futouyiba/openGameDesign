import React from 'react';
import './ModelStatusBar.css';

export interface ModelStatus {
    connected: boolean;
    model?: string;
    provider?: string;
    activeBranch?: string;
    branchTopic?: string;
}

interface Props {
    status: ModelStatus;
}

export const ModelStatusBar: React.FC<Props> = ({ status }) => {
    return (
        <div className={`model-status-bar ${status.connected ? 'connected' : 'disconnected'}`}>
            <div className="status-indicator"></div>
            <span className="status-text">
                {status.connected
                    ? `Using: ${status.model}`
                    : 'No LLM Provider Configured'}
            </span>
            {!status.connected && (
                <span className="status-hint"> (Check VS Code Status Bar)</span>
            )}
            {status.activeBranch && status.activeBranch !== 'main' && (
                <span className="branch-badge"> 🌿 {status.branchTopic}</span>
            )}
        </div>
    );
};
