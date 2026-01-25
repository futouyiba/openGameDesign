import * as vscode from 'vscode';
import { InterviewPanel } from '../panels/InterviewPanel';
import { Session } from '../core/session';
import { LlmSelection } from '../llm/types';

export async function startInterviewCommand(context: vscode.ExtensionContext, session: Session, resolveLlmSelection: () => Promise<LlmSelection | undefined>) {
    const selection = await resolveLlmSelection();
    if (!selection) {
        return;
    }

    // Set phase
    await session.setPhase('interview');

    // Show panel
    InterviewPanel.render(context, session, selection);
}
