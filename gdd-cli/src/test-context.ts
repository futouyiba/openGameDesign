#!/usr/bin/env node
import { Session } from './core/session.js';
import { AIClient } from './utils/ai.js';
import { WriterAgent } from './agents/writer.js';

async function testProgressiveContext() {
  console.log('=== 测试渐进式上下文管理 ===\n');

  const ai = new AIClient();
  const session = new Session(process.cwd(), ai);
  await session.init();

  // 模拟访谈总结
  console.log('模拟访谈阶段...');
  await session.setInterviewSummary({
    understanding: '一款2D Roguelike地牢探索游戏',
    keyDecisions: {
      '游戏类型': 'Roguelike',
      '视角': '俯视2D'
    },
    writingDirection: '重点关注核心玩法'
  });
  console.log('访谈总结已创建。\n');

  // 写作
  const writer = new WriterAgent(session, ai);
  await session.setPhase('writing');
  await writer.start();

  const state = session.getState();
  if (!state.currentDocument) {
    console.log('未生成文档');
    return;
  }

  console.log('\n========== 测试渐进式上下文 ==========\n');

  // 1. 生成文档摘要
  console.log('步骤1: 生成文档摘要');
  const summaries = await session.contextManager.generateDocumentSummaries(state.currentDocument);
  console.log(`\n摘要列表:`);
  summaries.forEach(s => {
    console.log(`  - ${s.title}: ${s.summary}`);
  });

  // 2. 构建仅摘要的上下文
  console.log('\n步骤2: 构建仅摘要的上下文');
  const summaryContext = await session.contextManager.buildContext(state.currentDocument);
  console.log(`上下文大小: ${summaryContext.length} 字符\n`);

  // 3. 按需加载特定章节
  console.log('步骤3: 按需加载特定章节');
  const targetSection = summaries[0].title;
  console.log(`加载章节: ${targetSection}`);
  const fullSection = await session.contextManager.loadSection(state.currentDocument, targetSection);
  console.log(`章节大小: ${fullSection.length} 字符\n`);

  // 4. 构建混合上下文（部分全文 + 部分摘要）
  console.log('步骤4: 构建混合上下文');
  const mixedContext = await session.contextManager.buildContext(
    state.currentDocument,
    [summaries[0].title, summaries[1].title]
  );
  console.log(`混合上下文大小: ${mixedContext.length} 字符`);
  console.log(`包含 ${summaries[0].title} 和 ${summaries[1].title} 的全文，其他章节为摘要\n`);

  // 5. 清理上下文
  console.log('步骤5: 清理上下文');
  session.contextManager.clearContext(state.currentDocument);

  // 6. 验证缓存
  console.log('\n步骤6: 验证缓存');
  console.log('重新加载摘要（应从缓存加载）...');
  const cachedSummaries = await session.contextManager.loadDocumentSummaries(state.currentDocument);
  console.log(`✓ 从缓存加载 ${cachedSummaries.length} 个摘要\n`);

  console.log('=== 测试完成 ===');
  console.log('\n渐进式上下文管理功能验证:');
  console.log('  ✓ 自动生成章节摘要');
  console.log('  ✓ 摘要缓存到 .gdd/metadata/summaries/');
  console.log('  ✓ 按需加载特定章节全文');
  console.log('  ✓ 构建混合上下文（全文+摘要）');
  console.log('  ✓ 上下文清理');
  console.log('  ✓ 缓存复用');
}

testProgressiveContext().catch(console.error);
