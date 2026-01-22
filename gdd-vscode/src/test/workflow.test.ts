import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { Session } from '../core/session';
import { MailSystem } from '../core/mail';
import { InterviewerAgent } from '../agents/interviewer';
import { WriterAgent } from '../agents/writer';
import { ReviewerAgent } from '../agents/reviewer';

class MockAIClient {
  async chat(messages: { role: 'user' | 'assistant'; content: string }[], systemPrompt?: string): Promise<string> {
    const combined = [systemPrompt, ...messages.map(m => m.content)].filter(Boolean).join('\n');

    if (combined.includes('生成文档大纲')) {
      return JSON.stringify([
        { title: '游戏概述', content: '' },
        { title: '核心玩法', content: '' }
      ]);
    }

    if (combined.includes('生成结构化的总结')) {
      return JSON.stringify({
        understanding: '测试用的游戏概念',
        keyDecisions: { genre: 'RPG', platform: 'PC' },
        writingDirection: '轻量化原型验证'
      });
    }

    if (combined.includes('提取水下文档信息')) {
      return JSON.stringify({
        context: ['受限于测试环境'],
        alternatives: [],
        tradeoffs: [],
        risks: [],
        openQuestions: []
      });
    }

    if (combined.includes('提取关键洞察') || combined.includes('提取洞察')) {
      return JSON.stringify({
        context: ['需要确认玩法节奏'],
        openQuestions: ['核心循环如何迭代']
      });
    }

    if (combined.includes('审阅这份文档')) {
      return JSON.stringify({
        inline: [
          {
            file: 'game-design-document.md',
            line: 1,
            type: 'logic',
            message: '需要澄清目标受众',
            severity: 'major'
          }
        ],
        summary: '整体结构可行，但需补充细节。',
        severity: 'major'
      });
    }

    if (combined.includes('修复该问题')) {
      return 'FIXED CONTENT\n\n已补充目标受众描述。';
    }

    return 'AI 回复';
  }
}

async function setupWorkspace(): Promise<string> {
  const workspaceDir = process.env.GDD_TEST_WORKSPACE;
  if (!workspaceDir) {
    throw new Error('GDD_TEST_WORKSPACE not set for workflow tests');
  }
  return workspaceDir;
}


suite('Workflow Integration', () => {
  let workspaceRoot = '';

  suiteSetup(async () => {
    try {
      workspaceRoot = await setupWorkspace();
    } catch (error) {
      throw error;
    }
  });

  suiteTeardown(() => {
    if (workspaceRoot && process.env.GDD_TEST_WORKSPACE_TEMP === 'true') {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test('Interview flow creates summary and underwater notes', async () => {
    const session = new Session(workspaceRoot);
    await session.init();

    const state = session.getState();
    state.outputDir = 'docs';
    await session.saveState();

    fs.mkdirSync(path.join(workspaceRoot, 'docs'), { recursive: true });

    const interviewer = new InterviewerAgent(session, new MockAIClient() as any);
    const response = await interviewer.chat('我们要做一个轻量化的RPG。');
    assert.ok(response.includes('AI'));

    const summary = await interviewer.generateSummary();
    assert.strictEqual(summary.understanding, '测试用的游戏概念');
    assert.ok(session.getState().interviewSummary);

    await session.setPhase('writing');
    assert.strictEqual(session.getState().phase, 'writing');

    const underwaterPath = path.join(workspaceRoot, 'docs', 'game-design-document.underwater.md');
    assert.ok(fs.existsSync(underwaterPath), 'Underwater doc should be generated');

    const underwaterContent = fs.readFileSync(underwaterPath, 'utf-8');
    assert.ok(
      underwaterContent.includes('# Underwater Doc'),
      'Underwater doc should include header'
    );
  });

  test('Session persists state and conversation history', async () => {
    const session = new Session(workspaceRoot);
    await session.init();

    await session.setPhase('writing');
    await session.setLlmSelection({ providerId: 'test', modelId: 'mock-model' });
    await session.addConversationMessage({ role: 'user', content: 'Hello' });
    await session.addConversationMessage({ role: 'ai', content: 'World' });

    const configPath = path.join(workspaceRoot, '.gdd', 'config.json');
    assert.ok(fs.existsSync(configPath), 'Config file should be written');

    const persisted = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.strictEqual(persisted.phase, 'writing');
    assert.deepStrictEqual(persisted.llmSelection, { providerId: 'test', modelId: 'mock-model' });
    assert.ok(Array.isArray(persisted.conversationHistory));
    assert.strictEqual(persisted.conversationHistory.length, 2);

    const reloaded = new Session(workspaceRoot);
    await reloaded.init();
    assert.strictEqual(reloaded.getState().phase, 'writing');
    assert.deepStrictEqual(reloaded.getState().llmSelection, { providerId: 'test', modelId: 'mock-model' });
    assert.strictEqual(reloaded.getConversationHistory().length, 2);
  });

  test('Mail system supports bidirectional flow', async () => {
    const mailSystem = new MailSystem(workspaceRoot);
    await mailSystem.init();

    await mailSystem.sendMail({
      type: 'command',
      priority: 'urgent',
      from: 'user',
      content: '请尽快生成概要'
    });

    await mailSystem.sendMail({
      type: 'comment',
      priority: 'normal',
      from: 'agent',
      content: '已收到，将在下一轮更新'
    });

    const userMails = mailSystem.getMailsByFrom('user');
    const agentMails = mailSystem.getMailsByFrom('agent');
    assert.strictEqual(userMails.length, 1);
    assert.strictEqual(agentMails.length, 1);

    await mailSystem.markRead(userMails[0].id);
    await mailSystem.markProcessed(agentMails[0].id);

    const processed = mailSystem.getMailsByStatus('processed');
    assert.strictEqual(processed.length, 1);
  });

  test('Mail system supports draft lifecycle and priority filters', async () => {
    const mailSystem = new MailSystem(workspaceRoot);
    await mailSystem.init();

    const draft = await mailSystem.createDraft({
      type: 'command',
      priority: 'urgent',
      from: 'user',
      content: 'draft mail'
    });
    assert.strictEqual(draft.status, 'draft');

    await mailSystem.sendDraft(draft.id);
    const sent = mailSystem.getMailsByStatus('sent');
    assert.ok(sent.some(m => m.id === draft.id));

    const urgent = mailSystem.getUnprocessedMails(['urgent']);
    assert.ok(urgent.some(m => m.id === draft.id));

    await mailSystem.markProcessed(draft.id);
    const urgentAfter = mailSystem.getUnprocessedMails(['urgent']);
    assert.ok(!urgentAfter.some(m => m.id === draft.id));
  });

  test('Writing and review phases generate documents', async () => {
    const session = new Session(workspaceRoot);
    await session.init();

    const state = session.getState();
    state.outputDir = 'docs';
    state.interviewSummary = {
      understanding: '测试用的游戏概念',
      keyDecisions: { genre: 'RPG' },
      writingDirection: '快速原型'
    };
    await session.saveState();

    const writer = new WriterAgent(session, new MockAIClient() as any);
    await writer.start();

    await session.setPhase('reviewing');
    assert.strictEqual(session.getState().phase, 'reviewing');

    const docPath = path.join(workspaceRoot, 'docs', 'game-design-document.md');
    assert.ok(fs.existsSync(docPath), 'GDD document should exist');

    const gddContent = fs.readFileSync(docPath, 'utf-8');
    assert.ok(gddContent.includes('# 游戏策划文档'), 'Document should include title');
    assert.ok(gddContent.includes('## 游戏概述'), 'Document should include outline sections');

    const underwaterPath = path.join(workspaceRoot, 'docs', 'game-design-document.underwater.md');
    assert.ok(fs.existsSync(underwaterPath), 'Underwater doc should exist after writing');
    const underwaterContent = fs.readFileSync(underwaterPath, 'utf-8');
    assert.ok(
      underwaterContent.includes('## Context & Constraints'),
      'Underwater doc should include Context section'
    );
    assert.ok(
      underwaterContent.includes('受限于测试环境'),
      'Underwater doc should include extracted context'
    );
    assert.ok(
      underwaterContent.includes('## Decision Log'),
      'Underwater doc should include Decision Log section'
    );
    assert.ok(
      underwaterContent.includes('### genre'),
      'Underwater doc should include decisions from summary'
    );

    const reviewer = new ReviewerAgent(session, new MockAIClient() as any);
    const reviewResult = await reviewer.review(docPath);
    await reviewer.fixIssues(docPath, reviewResult.inline);

    const updated = fs.readFileSync(docPath, 'utf-8');
    assert.ok(updated.includes('FIXED CONTENT'), 'Document should include fixed content');
  });

  test('Comment controller stores comment mail with range metadata', async () => {
    const { CommentController } = await import('../comments/CommentController');

    const session = new Session(workspaceRoot);
    await session.init();

    const docsDir = path.join(workspaceRoot, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });

    const docPath = path.join(docsDir, 'comments.md');
    fs.writeFileSync(docPath, '# Title\n\nHello world\n', 'utf-8');

    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(docPath));
    const controller = new CommentController(session);

    const range = new vscode.Range(new vscode.Position(2, 0), new vscode.Position(2, 5));
    await controller.addComment(document, range, '这是一条评论');
    controller.dispose();

    const mailFile = path.join(workspaceRoot, '.gdd', 'mails', 'mails.json');
    assert.ok(fs.existsSync(mailFile), 'Mail storage should exist');
    const mails = JSON.parse(fs.readFileSync(mailFile, 'utf-8')) as any[];
    const commentMail = mails.find(m => m.type === 'comment' && String(m.content).includes('这是一条评论'));
    assert.ok(commentMail, 'Expected comment mail to be stored');
    assert.ok(Array.isArray(commentMail.comments) && commentMail.comments.length === 1);
    assert.strictEqual(commentMail.comments[0].range.startLine, 2);
    assert.strictEqual(commentMail.comments[0].range.endLine, 2);
    assert.strictEqual(commentMail.comments[0].range.text, 'Hello');
  });
});
