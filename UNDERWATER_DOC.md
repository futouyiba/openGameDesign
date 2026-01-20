# Underwater Doc 功能说明

## 概述

Underwater Doc（水下文档）是一个自动生成的内部文档，用于记录游戏设计文档背后的思考过程、决策依据和上下文信息。

## 功能特点

### 自动生成
- 在访谈阶段提取对话洞察
- 在写作阶段分析决策和权衡
- 自动保存为 `<DocName>.underwater.md`

### 内容结构

每个 Underwater Doc 包含以下部分：

1. **Context & Constraints**（背景与约束）
   - 项目背景信息
   - 技术或资源约束
   - 团队限制

2. **Decision Log**（决策日志）
   - 关键决策记录
   - 决策依据和理由
   - 决策时间戳

3. **Alternatives Considered**（备选方案）
   - 考虑过的其他方案
   - 拒绝原因
   - 方案对比

4. **Trade-offs**（权衡）
   - 设计权衡
   - 优缺点分析

5. **Risks**（风险）
   - 潜在风险
   - 技术风险
   - 业务风险

6. **Open Questions**（待解决问题）
   - 未解决的问题
   - 需要进一步讨论的点

## 使用场景

### 1. 团队协作
- 新成员快速了解项目背景
- 理解设计决策的来龙去脉
- 避免重复讨论已否决的方案

### 2. 项目回顾
- 复盘设计决策
- 分析决策效果
- 总结经验教训

### 3. 文档维护
- 更新文档时参考原始思路
- 保持设计一致性
- 避免偏离初衷

## 技术实现

### CLI 集成

```typescript
// InterviewerAgent 提取对话洞察
await this.extractConversationInsights();

// WriterAgent 生成完整水下文档
await this.generateUnderwaterDoc();
await this.underwater.save();
```

### VS Code 扩展集成

- 访谈完成后自动提取洞察
- 文档生成后自动创建水下文档
- 与主文档同目录保存

## 文件位置

```
project/
├── game-design-document.md          # 主文档（Surface Doc）
└── game-design-document.underwater.md  # 水下文档（Underwater Doc）
```

## 示例

```markdown
# Underwater Doc

> Internal rationale for: game-design-document.md

## Context & Constraints

- 团队规模：5人小团队
- 开发周期：6个月
- 目标平台：移动端

## Decision Log

### 采用回合制战斗系统
- **Rationale**: 适合移动端操作，降低实时网络要求
- **Date**: 2026-01-20

### 使用 Unity 引擎
- **Rationale**: 团队熟悉，跨平台支持好
- **Date**: 2026-01-20

## Alternatives Considered

- **实时战斗系统**: 对网络要求高，移动端操作复杂
- **Unreal Engine**: 团队不熟悉，学习成本高

## Trade-offs

- 回合制牺牲了动作感，但提升了策略深度
- Unity 性能不如原生，但开发效率高

## Risks

- 回合制可能不符合部分玩家预期
- 移动端性能优化挑战

## Open Questions

- 是否需要 PvP 模式？
- 付费模式：买断还是内购？
```

## 注意事项

1. **不重复主文档内容**：只记录思考过程，不复述文档内容
2. **简洁明了**：使用要点形式，避免冗长对话记录
3. **持续更新**：重大决策变更时更新水下文档
4. **内部使用**：水下文档仅供团队内部参考，不对外分享
