# 开发复盘与技术沉淀 (Retrospective)

**日期**: 2026-01-23
**主题**: VS Code Webview 调试、E2E 测试与 React 重构

## 1. 工具与 Skill 评估
- **VS Code UI Test Skill**:
    - **使用情况**: 我们使用了 WDIO (WebdriverIO) 和 `wdio-vscode-service`，这属于 Agent 的核心测试能力领域。
    - **效果**: 也就是“自动化测试”。它是一把双刃剑。
        - **优点**: 它诚实地告诉了我们“功能坏了”（Exit Code 1）。
        - **局限**: 在日志输出被截断（PowerShell/Terminal 交互限制）的情况下，它无法告诉我们“为什么坏了”。在这种情况下，盲目依赖自动化报错会陷入死胡同。

## 2. 踩坑记录 (Initial Challenges)
在调试过程中，我们遇到了两个非理性的“拦路虎”：
1.  **日志截断与环境黑盒**: 测试运行失败，但只输出了 `FAILED`，关键的 Stack Trace 丢失。这迫使我们不能仅依赖日志，必须结合代码静态分析。
2.  **测试环境的“状态不一致”**:
    - **假设**: 测试脚本假设每次都是“全新启动”，会有 Directory Input -> QuickPick -> API Key Input 的完整流程。
    - **现实**: 用户的环境是“脏”的（Persisted State），扩展自动恢复了上次的会话，导致所有预期的 InputBox 都没有出现，导致测试超时。
3.  **隐蔽的语法错误**: 问题的根源（点击发送无反应）实际上是一个非常低级的 `InterviewPanel.ts` 中的重复 `<script>` 标签。这种错误在“字符串拼接 HTML”的模式下极难被发现，因为没有 IDE 的语法检查。

## 3. 破局之道 (The Pivot)
我们是如何成功的？
1.  **策略转换 (Defensive Testing)**:
    - 我们重写了测试脚本 `interview.e2e.ts`，加入了**防御性编程**（Try-Catch Check）。不再假设“输入框一定会出现”，而是“如果出现了就处理，没出现就继续”。这让测试脚本具备了适应不同环境的鲁棒性。
2.  **回归本源**:
    - 在测试日志无效时，我们没有继续在该死胡同里打转，而是回到 `InterviewPanel.ts` 进行人工代码审查，肉眼发现了 `<script>` 标签的结构错误。
3.  **降维打击 (Refactoring)**:
    - 这是最关键的一步。我们意识到修补 `InterviewPanel.ts` 的字符串拼接是无底洞。
    - **决策**: 引入 **React + Vite**。
    - **结果**: 通过架构升级，彻底消除了“HTML 语法错误”这类低级问题的土壤，同时获得了组件化、热重载、生态库支持（Mermaid）等一系列红利。

## 4. 经验沉淀 (Best Practices)

### 对于 VS Code 扩展开发：
> **Rule #1**: **永远不要用字符串拼接 HTML 来开发 Webview。**

- **为什么**: 没有类型检查，没有语法高亮，容易出错（转义字符、闭合标签），且难以维护。
- **最佳实践**: 始终使用 **React/Vue + 构建工具 (Vite/Webpack)**。配置好 `OnDiskPath` 和 `Content-Security-Policy`，将 Webview 开发体验对齐现代前端标准。

### 对于自动化测试 (E2E)：
> **Rule #2**: **测试脚本必须假设环境是“不可靠”的。**

- 不要写线性的 `step1 -> step2 -> step3`。
- 要写状态驱动的 `wait(feature) -> if(prompt) handle() -> assert(result)`。
- 在 CI/CD 无法看到屏幕时，详细的 Console Log 比断言错误更有价值。

### 对于问题排查：
- 当现象是“点击没反应”且控制台无报错时，90% 是 **HTML结构/CSP策略** 问题导致 JS 根本没加载或被拦截。
