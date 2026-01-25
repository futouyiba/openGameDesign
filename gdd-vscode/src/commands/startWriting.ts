import * as vscode from 'vscode';
import { Session } from '../core/session';
import { LlmSelection } from '../llm/types';
import { WriterAgent } from '../agents/writer';
import { AIClient } from '../utils/ai';
import { PreviewPanel } from '../panels/PreviewPanel';
import { ExtensionState } from '../core/types';

export async function startWritingCommand(
    context: vscode.ExtensionContext,
    session: Session,
    resolveLlmSelection: () => Promise<LlmSelection | undefined>,
    updateState: (key: keyof ExtensionState, value: any) => Promise<void>
) {
    const selection = await resolveLlmSelection();
    if (!selection) {
        return;
    }

    await session.setPhase('writing');
    await updateState('isWriterMode', true);

    // Create Agent
    const ai = new AIClient(context, selection);
    const writer = new WriterAgent(session, ai);

    // Setup Progress Provider if strictly needed here or global
    // But WriterAgent usually needs one.
    // For refactoring, we assume globalProgressProvider is handled via singleton or similar pattern,
    // OR we pass it. But let's keep it simple: WriterAgent in original code handled it via global var or setter.

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "正在生成初稿...",
        cancellable: false
    }, async (progress) => {
        try {
            await writer.generateDraft(progress);

            // Show preview
            const doc = await session.getMarkdownDocument();
            PreviewPanel.render(context.extensionUri, doc.uri.fsPath);

            vscode.window.showInformationMessage('初稿生成完成！');
        } catch (error) {
            vscode.window.showErrorMessage(`生成失败: ${error}`);
        }
    });
}
