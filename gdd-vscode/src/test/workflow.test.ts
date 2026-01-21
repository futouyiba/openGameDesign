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

    const reviewer = new ReviewerAgent(session, new MockAIClient() as any);
    const reviewResult = await reviewer.review(docPath);
    await reviewer.fixIssues(docPath, reviewResult.inline);

    const updated = fs.readFileSync(docPath, 'utf-8');
    assert.ok(updated.includes('FIXED CONTENT'), 'Document should include fixed content');
  });
});