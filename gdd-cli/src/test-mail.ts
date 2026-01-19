#!/usr/bin/env node
import { Session } from './core/session.js';
import { AIClient } from './utils/ai.js';
import { WriterAgent } from './agents/writer.js';
import { ReviewerAgent } from './agents/reviewer.js';

async function testMailWorkflow() {
  console.log('=== 测试Mail工作流 ===\n');

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

  // 预先发送一些Mail
  console.log('发送测试邮件...');

  await session.mailSystem.sendMail({
    type: 'opinion',
    priority: 'normal',
    content: '请在战斗系统中强调技能组合和连招机制'
  });

  await session.mailSystem.sendMail({
    type: 'comment',
    priority: 'normal',
    content: '修改建议',
    comments: [{
      range: { file: '核心玩法', start: 1, end: 10 },
      content: '核心玩法循环需要更详细的描述，特别是玩家的短期目标和长期目标'
    }]
  });

  console.log('已发送2封邮件\n');

  // 启动写作
  const ai = new AIClient();
  const writer = new WriterAgent(session, ai);

  await session.setPhase('writing');
  await writer.start();

  // 审阅
  const state = session.getState();
  if (state.currentDocument) {
    await session.setPhase('reviewing');
    const reviewer = new ReviewerAgent(session, ai);
    await reviewer.review(state.currentDocument);
  }

  console.log('\n=== 测试完成 ===');
  console.log('提示: 运行 "npm run preview" 在VS Code中查看文档');
}

testMailWorkflow().catch(console.error);
