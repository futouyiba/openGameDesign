# 游戏策划文档神器 - 完整指南

## 🎉 项目概述

一个AI驱动的游戏策划文档撰写工具，提供CLI和VS Code插件两种使用方式。

### 核心价值

- **深度访谈** - AI充分理解需求
- **实时交互** - Mail机制实时干预
- **自动生成** - 图文并茂的专业文档
- **质量保证** - 审阅闭环自动修复
- **高效管理** - 渐进式上下文

---

## 📦 安装

### 方式1: CLI工具

```bash
# 全局安装
npm install -g @gdd/cli

# 或本地使用
cd gdd-cli
npm install
npm link
```

### 方式2: VS Code插件

```bash
# 方法A: 从.vsix安装
code --install-extension gdd-assistant-0.1.0.vsix

# 方法B: 开发模式
cd gdd-vscode
code .
# 按F5启动调试
```

---

## 🚀 快速开始

### CLI使用

```bash
# 1. 设置API密钥
export ANTHROPIC_API_KEY=your_key_here

# 2. 查看可用模板
gdd templates

# 3. 开始新文档
gdd start --template game-design

# 4. 发送邮件（在写作过程中）
gdd mail

# 5. 预览文档
gdd preview
```

### VS Code插件使用

1. 打开工作区
2. `Ctrl+Shift+P` → `GDD: Start New Document`
3. 在访谈面板中与AI对话
4. 点击"完成访谈"
5. 自动生成文档
6. 在预览面板查看（带Mermaid渲染）

---

## 📖 详细功能

### 1. 访谈系统

**CLI模式**:
- 命令行交互式访谈
- 自动保存对话历史

**VS Code模式**:
- 图形化Webview界面
- 实时AI对话
- 自动生成访谈总结

### 2. Mail机制 ⭐

在写作过程中发送指令：

**邮件类型**:
- `command` - 命令（如"停止"）
- `opinion` - 意见（影响写作方向）
- `comment` - 批注（修改特定章节）

**优先级**:
- `urgent` - 紧急（每轮必查）
- `normal` - 普通（Agent自主判断）
- `low` - 低优先级

**使用示例**:
```bash
# CLI
gdd mail
# 选择类型、优先级、输入内容

# VS Code
Ctrl+Shift+P → GDD: Send Mail to Agent
```

### 3. 多轮写作

**流程**:
1. 生成文档大纲（10章节）
2. 逐章节撰写
3. 每轮检查Mail
4. 自动生成Mermaid图表
5. 实时保存进度

**特点**:
- 可控、可干预、可恢复
- 图文并茂
- 中文输出

### 4. 审阅闭环

**审阅维度**:
- 内容逻辑
- 内部一致性
- 行业最佳实践
- 实施可行性

**自动修复**:
- Critical问题 → 立即修复
- Major问题 → 立即修复
- Minor问题 → 保留

**迭代**:
- 最多3轮
- 直到没有Critical/Major问题

### 5. 渐进式上下文

**机制**:
- 先加载章节摘要
- 发现问题时加载全文
- 用完清理上下文

**优势**:
- 避免上下文污染
- 支持更大文档
- 提升效率

### 6. 文档模板

**预定义模板**:
1. **游戏策划文档** - 游戏概述、核心玩法、系统设计等
2. **产品需求文档** - 产品概述、用户画像、功能需求等
3. **技术设计文档** - 系统概述、架构设计、模块设计等
4. **API文档** - API概述、认证方式、接口列表等

**使用**:
```bash
gdd start --template game-design
```

---

## 🎯 完整工作流

### CLI工作流

```
1. gdd start
   ↓
2. 访谈对话（命令行）
   ↓
3. 输入"done"完成访谈
   ↓
4. 自动生成大纲
   ↓
5. 逐章节撰写（可发送Mail）
   ↓
6. 审阅并自动修复
   ↓
7. 生成 game-design-document.md
```

### VS Code工作流

```
1. Ctrl+Shift+P → GDD: Start New Document
   ↓
2. Webview访谈面板对话
   ↓
3. 点击"完成访谈"
   ↓
4. 自动生成大纲
   ↓
5. 逐章节撰写（实时进度显示）
   ↓
6. 自动打开预览面板（Mermaid渲染）
   ↓
7. 文档保存在工作区根目录
```

---

## 📁 项目结构

### CLI项目

```
gdd-cli/
├── src/
│   ├── core/          # 核心系统
│   ├── agents/        # AI Agents
│   ├── storage/       # 存储管理
│   └── utils/         # 工具函数
├── .gdd/              # 项目数据
│   ├── config.json
│   ├── mails/
│   └── metadata/
└── game-design-document.md  # 生成的文档
```

### VS Code插件

```
gdd-vscode/
├── src/
│   ├── extension.ts   # 扩展入口
│   ├── panels/        # Webview面板
│   ├── providers/     # 侧边栏视图
│   ├── core/          # 核心系统
│   ├── agents/        # AI Agents
│   └── utils/         # 工具函数
└── gdd-assistant-0.1.0.vsix  # 打包文件
```

---

## ⚙️ 配置

### 环境变量

```bash
# 必需
export ANTHROPIC_API_KEY=your_key_here

# 可选
export GDD_MODEL=claude-sonnet-4-5-20250929
```

### VS Code设置

```json
{
  "gdd.apiKey": "your_key_here",
  "gdd.model": "claude-sonnet-4-5-20250929"
}
```

---

## 🎨 功能特性对比

| 功能 | CLI | VS Code |
|------|-----|---------|
| 访谈系统 | ✅ 命令行 | ✅ 图形化 |
| Mail机制 | ✅ | ✅ |
| 多轮写作 | ✅ | ✅ |
| 审阅闭环 | ✅ | ⏳ |
| Mermaid预览 | ⏳ | ✅ |
| 进度可视化 | ✅ 命令行 | ✅ 侧边栏 |
| 实时通知 | ✅ | ✅ |
| 模板系统 | ✅ | ⏳ |

---

## 📊 性能指标

- **API调用**: 20-40次（10章节文档）
- **生成时间**: 15-40分钟（含访谈）
- **文档质量**: 专业、可执行、图文并茂
- **支持语言**: 中文

---

## 🐛 故障排除

### CLI问题

**问题**: API调用失败
```bash
# 检查API密钥
echo $ANTHROPIC_API_KEY

# 测试连接
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY"
```

**问题**: 命令未找到
```bash
# 重新链接
npm link

# 或使用npx
npx gdd start
```

### VS Code问题

**问题**: 扩展未激活
- 检查是否安装成功
- 重启VS Code
- 查看输出面板错误

**问题**: Webview空白
- 检查网络连接（CDN资源）
- 查看开发者工具控制台

---

## 📚 示例

### 示例1: 创建游戏策划文档

```bash
gdd start --template game-design
# 回答AI问题...
# 文档自动生成
```

### 示例2: 使用Mail修改

```bash
# 启动写作
gdd start

# 在另一个终端发送Mail
gdd mail
# 类型: opinion
# 优先级: normal
# 内容: 请在战斗系统中强调技能组合
```

### 示例3: VS Code完整流程

1. 打开项目文件夹
2. `Ctrl+Shift+P` → `GDD: Start New Document`
3. 访谈对话
4. 完成访谈
5. 查看侧边栏进度
6. 预览面板查看文档

---

## 🔗 相关资源

- **GitHub**: https://github.com/yourusername/gdd-cli
- **文档**: 见ARCHITECTURE.md和FEATURES.md
- **问题反馈**: GitHub Issues

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- Claude API by Anthropic
- Mermaid.js
- VS Code Extension API

---

## 总结

**两种使用方式，满足不同需求**:
- **CLI** - 命令行爱好者、自动化脚本
- **VS Code** - 图形化界面、更好的用户体验

**核心优势**:
- ✅ AI驱动，智能生成
- ✅ 实时交互，可控可干预
- ✅ 图文并茂，专业输出
- ✅ 质量保证，自动审阅
- ✅ 开箱即用，简单易用

**立即开始使用，提升文档撰写效率！**
