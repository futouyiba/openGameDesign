import * as vscode from 'vscode';
import { Session } from '../core/session';
import { AIClient } from '../utils/ai';
import { LlmSelection } from '../llm/types';
import { ContextManager } from '../core/contextManager';
import { DebugService } from '../core/debugService';
import { InterviewerAgent } from '../agents/interviewer';
import { log } from '../utils/logger';

export class InterviewManager {
    private interviewer: InterviewerAgent;
    private contextManager: ContextManager;

    constructor(
        private context: vscode.ExtensionContext,
        private session: Session,
        private ai: AIClient
    ) {
        this.interviewer = new InterviewerAgent(this.session, this.ai);
        this.contextManager = ContextManager.getInstance(context, ai);
    }

    public async handleUserAnswer(text: string, conversationHistory: Array<{ role: 'ai' | 'user'; content: string }>): Promise<string> {
        // 1. Add to session history
        await this.session.addConversationMessage({ role: 'user', content: text });

        // 2. Load Smart Context
        let contextContent = '';
        try {
            const branchTopic = this.session.getActiveBranchTopic();
            const taskDesc = branchTopic
                ? `User Answer: "${text}". Current Branch: "${branchTopic}". Task: Reply to user and drive GDD creation.`
                : `User Answer: "${text}". Task: Reply to user and drive GDD creation.`;

            const selectedFiles = await this.contextManager.selectContextForTask(taskDesc);
            if (selectedFiles.length > 0) {
                contextContent = await this.contextManager.loadContextContent(selectedFiles);
                log('Context loaded', { files: selectedFiles });
            }
        } catch (err) {
            console.warn('Failed to load context:', err);
        }

        // 3. Prepare AI Prompt
        const messages = conversationHistory.map(m => ({
            role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
            content: m.content
        }));

        // Add current user message if not in history yet
        if (messages.length === 0 || messages[messages.length - 1].content !== text) {
            messages.push({ role: 'user', content: text });
        }

        const topic = this.session.getActiveBranchTopic();
        const branchPrompt = topic ? `\n\n当前状态：正在进行子话题 "${topic}" 的讨论。请专注于该话题，不要发散到主线其他部分。` : '';

        let systemPrompt = `你是一位世界级的游戏制作人与策划专家（Game Director）。你的目标是通过访谈，辅助用户完成一份高质量的游戏策划案（GDD）。${branchPrompt}

<interview_protocol>
1. **主动引导**: 不要被动等待。如果用户回答简短，请追问细节。
2. **结构化思维**: 始终关注 GDD 的核心模块：核心玩法, 世界观, 角色, 美术与音效。
3. **确认与复述**: 简要复述你对当前需求的理解。
4. **思维链**: 内心思考用户涉及的模块和信息完整度。
5. **风格**: 保持专业、热情、富有创造力。使用中文交流。
</interview_protocol>

当前阶段：头脑风暴与需求收集。无需生成完整的文档，专注于收集素材。`;

        if (contextContent) {
            systemPrompt += `\n\n[相关项目文档参考]\n${contextContent}\n[参考结束]\n请结合上述现有文档内容进行回答。`;
        }

        // 4. Call AI
        const response = await this.ai.chat(messages, systemPrompt);

        // 5. Save AI response
        await this.session.addConversationMessage({ role: 'ai', content: response });

        return response;
    }

    public async generateContextSummary(history: Array<{ role: 'ai' | 'user'; content: string }>, promptInstructions?: string): Promise<string> {
        if (history.length === 0) return "无内容";

        const messages = history.map(m => ({
            role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
            content: m.content
        }));

        messages.push({
            role: 'user',
            content: promptInstructions || "请简要总结上述对话的主线内容和关键信息，作为分支讨论的背景上下文。"
        });

        const sysPrompt = '你是总结专家。';
        try {
            const summary = await this.ai.chat(messages, sysPrompt);
            DebugService.getInstance().log('context', 'InterviewManager.generateContextSummary', 'Context Summary Generated', {
                input: messages,
                summary
            });
            return summary;
        } catch (e) {
            return "总结生成失败";
        }
    }
}
