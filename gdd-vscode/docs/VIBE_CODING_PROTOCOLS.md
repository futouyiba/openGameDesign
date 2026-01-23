# Vibe Coding Protocols: VS Code Extension Development

> **"Vibe Coding" 核心理念**: 让人专注于创意与决策，让 AI 处理实现与验证。为了达到这种流畅的心流状态，我们必须制定明确的“协议”，让 AI 队友不仅能写代码，还能写出符合项目基因的代码。

## 1. 架构协议 (Architecture Protocol)
**原则**: **UI 与逻辑解耦 (Decoupling UI from Logic)**

*   **UI 开发标准**:
    *   ❌ **禁止**：使用 `backtick` 字符串拼接 HTML。这是万恶之源。
    *   ✅ **必须**：使用 **React + Vite** 独立工程 (`webview-ui/`)。
    *   **理由**: 提供类型安全、组件化复用、以及 Mermaid 等富生态支持。AI 在处理 React 组件时的准确率远高于处理原生 DOM 字符串。
*   **通信标准**:
    *   使用 `vscode.postMessage` 进行强类型通信。
    *   在后端 (`InterviewPanel.ts`) 和前端 (`App.tsx`) 保持一致的消息 Command 定义。

## 2. 测试协议 (Testing Protocol)
**原则**: **防御性与鲁棒性 (Defensive & Robustness)**

*   **E2E 测试观**:
    *   **环境不可信**：测试脚本必须假设环境是“脏”的（可能有旧 Session，可能有弹窗）。
    *   **自适应探测**：使用 `try-catch` 探测 UI 元素（如 InputBox, QuickPick），存在即处理，不存在即跳过。
*   **调试友好性**:
    *   在 CI/CD 或 Headless 模式下，Console Log 是唯一的光。关键步骤必须输出日志。

## 3. AI 协作协议 (AI Collaboration Protocol)
**原则**: **结构化思维链 (Structured Chain of Thought)**

*   **System Prompt 设计**:
    *   不要只给“人设”，要给“协议 (`<protocol>`)”。
    *   强制 AI 在输出前进行 `<thinking>`（思维链），评估当前状态。
    *   示例结构：
        ```markdown
        <protocol>
        1. 确认用户意图 (Clarify)
        2. 分析完整性 (Analyze Gap)
        3. 主动引导 (Guide)
        </protocol>
        ```
*   **可视化增强**:
    *   涉及到流程、架构、状态机时，**默认**使用 Mermaid 绘图。
    *   AI 所有的复杂输出都应考虑“能否画成图？”

## 4. 沉淀清单 (The Checklist)
在开始新功能开发前，请检查：
- [ ] 这是一个 UI 功能吗？如果是 -> 建立 React 组件。
- [ ] 这个功能需要用户输入吗？如果是 -> 在测试脚本中增加对该 Input 的防御性处理。
- [ ] 这个功能复杂吗？如果是 -> 更新 System Prompt，教 AI 如何一步步引导用户。

---
*此文档旨在为未来的 Vibe Coding 提供上下文。当新的 AI Agent 接手项目时，请首先阅读此协议。*
