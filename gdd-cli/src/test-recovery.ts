#!/usr/bin/env node
import { Session } from './core/session';
import { AIClient } from './utils/ai';
import { InterviewerAgent } from './agents/interviewer';
import { writeFile } from 'fs/promises';
import { join } from 'path';

async function testInterviewRecovery() {
  console.log('=== 测试访谈恢复功能 ===\n');

  const ai = new AIClient();
  const session = new Session(process.cwd(), ai);
  await session.init();

  const state = session.getState();

  if (state.phase === 'interview' && state.conversationHistory && state.conversationHistory.length > 0) {
    console.log('✓ 检测到之前的访谈历史');
    console.log(`  - 阶段: ${state.phase}`);
    console.log(`  - 历史记录数: ${state.conversationHistory.length}\n`);

    console.log('=== 恢复历史对话 ===');
    state.conversationHistory.forEach((msg, index) => {
      const role = msg.role === 'user' ? '你' : 'Interviewer';
      console.log(`\n[${index + 1}] ${role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
    });
    console.log('\n✓ 访谈历史已成功恢复\n');

    console.log('提示: 运行 "npm start" 可以从中断处继续访谈');
  } else {
    console.log('✓ 没有检测到之前的访谈历史');
    console.log('提示: 运行 "npm start" 开始新的访谈\n');
  }

  // 保存测试状态文件以便验证
  const testStatePath = join(process.cwd(), '.gdd', 'test-recovery-state.json');
  await writeFile(testStatePath, JSON.stringify(state, null, 2));
  console.log(`✓ 测试状态已保存到: ${testStatePath}\n`);
}

testInterviewRecovery().catch(console.error);
