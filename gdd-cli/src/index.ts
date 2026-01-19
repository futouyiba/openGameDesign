#!/usr/bin/env node
import { Command } from 'commander';
import { Session } from './core/session.js';
import { AIClient } from './utils/ai.js';
import { InterviewerAgent } from './agents/interviewer.js';
import { WriterAgent } from './agents/writer.js';
import { ReviewerAgent } from './agents/reviewer.js';
import { DecisionTracker } from './storage/decisions.js';
import { listTemplates, getTemplate } from './storage/templates.js';
import inquirer from 'inquirer';

const program = new Command();

program
  .name('gdd')
  .description('AI-driven game design document writing tool')
  .version('0.1.0');

program
  .command('templates')
  .description('列出可用的文档模板')
  .action(() => {
    const templates = listTemplates();
    console.log('\n可用模板:\n');
    templates.forEach((t, i) => {
      console.log(`${i + 1}. ${t.name}`);
      console.log(`   ${t.description}\n`);
    });
  });

program
  .command('start')
  .description('开始新的GDD撰写会话')
  .option('-t, --template <name>', '使用指定模板')
  .action(async (options) => {
    const ai = new AIClient();
    const session = new Session(process.cwd(), ai);
    await session.init();

    const interviewer = new InterviewerAgent(session, ai);
    const writer = new WriterAgent(session, ai);
    const reviewer = new ReviewerAgent(session, ai);

    await interviewer.start();

    const state = session.getState();
    if (state.interviewSummary) {
      await session.setPhase('writing');
      await writer.start();

      if (state.currentDocument) {
        await session.setPhase('reviewing');
        // 使用审阅闭环，自动修复问题
        await reviewer.reviewAndFix(state.currentDocument, 3);
      }
    }

    console.log('\n会话完成!');
  });

program
  .command('preview')
  .description('在VS Code中预览文档')
  .action(async () => {
    const ai = new AIClient();
    const session = new Session(process.cwd(), ai);
    await session.init();

    const state = session.getState();
    if (state.currentDocument) {
      const { spawn } = await import('child_process');
      spawn('code', [state.currentDocument], { stdio: 'inherit' });
      console.log(`正在打开: ${state.currentDocument}`);
    } else {
      console.log('未找到文档。请先运行 gdd start');
    }
  });

program
  .command('mail')
  .description('向Agent发送邮件')
  .action(async () => {
    const ai = new AIClient();
    const session = new Session(process.cwd(), ai);
    await session.init();

    const { type } = await inquirer.prompt([{
      type: 'list',
      name: 'type',
      message: '邮件类型:',
      choices: ['command', 'opinion', 'comment']
    }]);

    const { priority } = await inquirer.prompt([{
      type: 'list',
      name: 'priority',
      message: '优先级:',
      choices: ['urgent', 'normal', 'low']
    }]);

    const { content } = await inquirer.prompt([{
      type: 'input',
      name: 'content',
      message: '内容:'
    }]);

    await session.mailSystem.sendMail({ type, priority, content });
    console.log('邮件已发送!');
  });

program.parse();
