# GDD Assistant - AI 驱动的游戏设计文档工具

一个基于 Claude AI 的游戏设计文档（GDD）自动生成工具，提供 CLI 和 VS Code 扩展两种使用方式。

## 项目架构

### 双界面设计

- **gdd-cli** - 命令行工具，适合自动化和脚本化场景
- **gdd-vscode** - VS Code 扩展，提供可视化交互界面

### 技术栈

- TypeScript
- Anthropic Claude API (claude-sonnet-4-5-20250929)
- OpenAI Whisper (语音转文字)
- Commander.js (CLI)
- VS Code Extension API

## 核心功能

### 1. 三阶段工作流

```
访谈阶段 → 写作阶段 → 审阅阶段
```

- **访谈阶段**：AI 专家进行深度对话，理解项目需求
- **写作阶段**：基于访谈生成结构化文档
- **审阅阶段**：多维度审查并自动修复问题（最多 3 轮迭代）

### 2. 邮件系统

异步通信机制，支持用户在写作过程中发送反馈：

- **类型**：command（命令）、opinion（意见）、comment（评论）
- **优先级**：urgent（紧急）、normal（普通）、low（低）
- AI 在每个章节写作前检查邮件并响应

### 3. 渐进式上下文管理

- 自动生成章节摘要
- 按需加载完整内容
- 避免 AI 上下文窗口污染

### 4. 智能审阅

多维度文档审查：
- 内容逻辑
- 内部一致性
- 行业最佳实践
- 实现可行性

## 项目结构

```
.
├── gdd-cli/                    # CLI 应用
│   ├── src/
│   │   ├── agents/            # AI 代理（访谈、写作、审阅）
│   │   ├── core/              # 核心系统（会话、邮件、上下文）
│   │   ├── storage/           # 数据持久化
│   │   └── utils/             # 工具函数
│   └── package.json
│
├── gdd-vscode/                # VS Code 扩展
│   ├── src/
│   │   ├── agents/            # AI 代理
│   │   ├── comments/          # 评论系统
│   │   ├── panels/            # Webview 面板
│   │   ├── providers/         # 树视图提供者
│   │   └── extension.ts       # 扩展入口
│   └── package.json
│
└── .gdd/                      # 工作区数据
    ├── config.json            # 会话状态
    ├── decisions.json         # 决策记录
    ├── mails/                 # 邮件存储
    └── metadata/              # 文档元数据
```

## 使用方式

### CLI

```bash
# 安装依赖
cd gdd-cli
npm install

# 开始新文档
npm run dev start

# 查看模板
npm run dev templates

# 发送邮件
npm run dev mail
```

### VS Code 扩展

1. 安装扩展：
```bash
code --install-extension gdd-vscode/gdd-assistant-0.2.1.vsix
```

2. 配置 API Key：
   - 打开设置 → 搜索 "GDD"
   - 设置 `gdd.apiKey`（Anthropic）
   - 设置 `gdd.openaiApiKey`（可选，用于语音输入）

3. 使用命令：
   - `Ctrl+Shift+P` → "GDD: Start New Document"
   - 在侧边栏查看进度和邮件
   - 选中文本 → `Ctrl+Shift+M` 添加评论

## 核心组件

### AI 代理

- **InterviewerAgent**：专业游戏设计专家，进行深度访谈
- **WriterAgent**：生成文档大纲和内容，支持 Mermaid 图表
- **ReviewerAgent**：多维度审查，自动修复问题

### 核心系统

- **Session**：管理工作流状态
- **MailSystem**：异步通信
- **ContextManager**：智能上下文管理
- **CommentController**：VS Code 评论集成

## 数据存储

所有数据存储在 `.gdd/` 目录：

```
.gdd/
├── config.json              # 会话状态
├── decisions.json           # 决策追踪
├── mails/
│   └── mails.json          # 邮件记录
└── metadata/
    └── summaries/          # 章节摘要缓存
```

## 设计特点

### 1. 渐进式披露
- 生成所有章节的摘要
- 仅在需要时加载完整内容
- 有效管理 AI 上下文窗口

### 2. 基于邮件的通信
- 异步用户反馈
- 基于优先级的处理
- 支持命令、意见和评论

### 3. 代理协作
- 三个专业化代理
- 顺序工作流与状态管理
- 迭代审查和修复循环

### 4. 双界面支持
- CLI 用于自动化
- VS Code 扩展用于交互式 GUI
- 共享核心逻辑

## 版本信息

- **当前版本**：0.2.1
- **发布者**：hyperbola-games
- **许可证**：见 LICENSE 文件

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)
