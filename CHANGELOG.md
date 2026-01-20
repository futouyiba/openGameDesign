# GDD Assistant - 更新日志

## v0.2.0 (2026-01-20)

### 🎉 重大更新

#### 1. 文档路径管理
- ✅ 启动时选择输出目录（默认 `docs/`）
- ✅ 自动创建目录结构
- ✅ 支持自定义路径

#### 2. Progress 可视化增强
- ✅ 可展开树形结构
- ✅ 章节级别进度显示
- ✅ 实时状态更新
```
⏳ 写作阶段 (3/10)
  ├── ✓ 游戏概述
  ├── ✓ 核心玩法
  ├── ⏳ 系统设计
  └── ...
```

#### 3. Mail 系统重构
- ✅ **状态机**: draft → sent → read → processed
- ✅ **双向邮件**: 用户 ↔ Agent
- ✅ **多评论支持**: 一封邮件包含多个 Comment
- ✅ **新 API**:
  - `createDraft()` - 创建草稿
  - `sendDraft()` - 发送草稿
  - `markRead()` - 标记已读
  - `getMailsByStatus()` - 按状态筛选
  - `getMailsByFrom()` - 按发件人筛选

#### 4. Comment API 集成 ⭐
- ✅ VS Code 原生评论系统
- ✅ 右键菜单: "GDD: Add Comment"
- ✅ 快捷键: `Ctrl+Shift+M` (Mac: `Cmd+Shift+M`)
- ✅ 自动保存到 Mail 系统
- ✅ 只在 Markdown 文件启用
- ✅ 支持选中文本评论

#### 5. 审阅系统完整集成
- ✅ 写作完成后自动审阅
- ✅ 自动修复 Critical/Major 问题
- ✅ 最多 3 轮迭代
- ✅ 实时通知

#### 6. Whisper 语音输入
- ✅ 集成 OpenAI Whisper API
- ✅ 话筒按钮 + 录音动画
- ✅ 自动转文字
- ✅ 配置: `gdd.openaiApiKey`

### 🔧 技术改进
- 使用 VS Code Comment API
- 状态机模式管理 Mail
- 树形数据结构优化 Progress
- 全局 ProgressProvider 注入

### 📦 安装
```bash
code --install-extension gdd-assistant-0.1.0.vsix
```

### ⚙️ 配置
```json
{
  "gdd.apiKey": "sk-ant-...",
  "gdd.openaiApiKey": "sk-...",
  "gdd.model": "claude-sonnet-4-5-20250929"
}
```

### 🎯 使用方式

#### 添加评论
1. 打开生成的文档
2. 选中文本
3. 右键 → "GDD: Add Comment" 或 `Ctrl+Shift+M`
4. 输入评论内容

#### 查看进度
- 左侧边栏 → GDD Assistant → Progress
- 展开"写作阶段"查看章节进度

---

## v0.1.0 (2026-01-19)

### 初始版本
- 访谈系统
- 多轮写作
- Mail 机制
- 审阅闭环
- 渐进式上下文
- Mermaid 图表
- 中文输出
