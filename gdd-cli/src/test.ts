#!/usr/bin/env node
import { Session } from './core/session.js';
import { AIClient } from './utils/ai.js';
import { InterviewerAgent } from './agents/interviewer.js';
import { WriterAgent } from './agents/writer.js';
import { ReviewerAgent } from './agents/reviewer.js';

async function testWorkflow() {
  console.log('=== 测试GDD CLI工作流 ===\n');

  const ai = new AIClient();
  const session = new Session(process.cwd(), ai);
  await session.init();

  // 模拟访谈总结
  console.log('模拟访谈阶段...');
  await session.setInterviewSummary({
    understanding: '一款2D Roguelike地牢探索游戏，具有程序化生成和永久死亡机制',
    keyDecisions: {
      '游戏类型': 'Roguelike/地牢探索',
      '视角': '俯视2D',
      '核心循环': '探索地牢、战斗、收集战利品、升级角色',
      '难度': '高难度，永久死亡'
    },
    writingDirection: '重点关注核心玩法机制、程序化生成系统和进度机制'
  });
  console.log('访谈总结已创建。\n');

  // 测试写作
  const ai = new AIClient();
  const writer = new WriterAgent(session, ai);

  await session.setPhase('writing');
  await writer.start();

  // 测试审阅
  const state = session.getState();
  if (state.currentDocument) {
    await session.setPhase('reviewing');
    const reviewer = new ReviewerAgent(session, ai);
    await reviewer.review(state.currentDocument);
  }

  console.log('\n=== 测试完成 ===');
  console.log('\n提示: 运行 "npm run preview" 在VS Code中查看文档');
}

testWorkflow().catch(console.error);
