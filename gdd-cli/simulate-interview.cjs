const fs = require('fs');
const path = require('path');

// 模拟一次访谈并保存历史
const configPath = path.join(process.cwd(), '.gdd', 'config.json');

console.log('=== 模拟访谈对话 ===\n');

const mockConversation = [
  {
    role: 'assistant',
    content: '你好！我将帮助你创建游戏策划文档。请告诉我，你想创建什么类型的游戏？'
  },
  {
    role: 'user',
    content: '我想创建一款2D像素风格的钓鱼游戏'
  },
  {
    role: 'assistant',
    content: '很有趣的选择！对于钓鱼游戏，你希望玩家体验什么样的核心玩法？是休闲放松还是竞技挑战？'
  },
  {
    role: 'user',
    content: '我希望是休闲放松的体验，玩家可以在不同的场景下钓鱼，收集各种鱼类'
  },
  {
    role: 'assistant',
    content: '了解。你计划支持哪些游戏平台？以及是否有特定的美术风格偏好？'
  }
];

const state = {
  phase: 'interview',
  conversationHistory: mockConversation
};

console.log('保存模拟的对话历史...\n');

// 保存状态
fs.writeFileSync(configPath, JSON.stringify(state, null, 2));

console.log(`✓ 已保存 ${mockConversation.length} 条对话记录到: ${configPath}\n`);

console.log('=== 保存的对话预览 ===');
mockConversation.forEach((msg, index) => {
  const role = msg.role === 'user' ? '你' : 'Interviewer';
  console.log(`\n[${index + 1}] ${role}:`);
  console.log(`    ${msg.content}`);
});

console.log('\n\n✓ 模拟访谈完成！');
console.log('提示: 运行 "node check-recovery.cjs" 来测试恢复功能\n');
