const fs = require('fs');
const path = require('path');

const configPath = path.join(process.cwd(), '.gdd', 'config.json');

console.log('=== 检查访谈恢复状态 ===\n');

try {
  const configData = fs.readFileSync(configPath, 'utf-8');
  const state = JSON.parse(configData);

  console.log('当前状态:');
  console.log(`  - 阶段: ${state.phase}`);
  console.log(`  - 输出目录: ${state.outputDir || '未设置'}`);

  if (state.phase === 'interview') {
    console.log('\n✓ 处于访谈阶段\n');

    if (state.conversationHistory && state.conversationHistory.length > 0) {
      console.log(`✓ 找到 ${state.conversationHistory.length} 条对话历史记录\n`);

      console.log('=== 对话历史预览 ===');
      state.conversationHistory.forEach((msg, index) => {
        const role = msg.role === 'user' ? '你' : 'Interviewer';
        const preview = msg.content.length > 80 ? msg.content.substring(0, 80) + '...' : msg.content;
        console.log(`\n[${index + 1}] ${role}:`);
        console.log(`    ${preview}`);
      });

      console.log('\n✓ 访谈恢复功能正常工作！');
      console.log('提示: 运行 "npm start" 将从中断处继续访谈');
    } else {
      console.log('✓ 没有之前的对话历史');
      console.log('提示: 运行 "npm start" 开始新的访谈');
    }
  } else {
    console.log(`\n当前不处于访谈阶段 (阶段: ${state.phase})`);
    console.log('提示: 删除 .gdd/config.json 以重新开始');
  }

  if (state.interviewSummary) {
    console.log('\n=== 访谈总结 ===');
    console.log(`理解: ${state.interviewSummary.understanding.substring(0, 100)}...`);
  }

} catch (error) {
  console.log('错误: 无法读取配置文件');
  console.log(error.message);
}

console.log('\n=== 测试完成 ===\n');
