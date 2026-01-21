# Project Lumina: Customized VS Code UI for Writers

## 1. Vision: The "Cursor" for Documentation
The goal was to transform VS Code from a complex IDE into a refined, "Cursor-like" environment tailored for writing documentation (specifically Game Design Documents). We aimed for an aesthetic that feels like a polished product rather than a developer tool.

## 2. Approach: Extension vs. Fork
Initially, the idea was to "fork" VS Code to achieve deep customization. However, after analysis, we opted for a **"Heavy Extension" strategy (Writer Mode)** for the following reasons:

### Why NOT a Full Fork?
*   **Maintenance Burden:** Maintaining a fork of VS Code (Electron app) requires keeping up with upstream Microsoft updates, which is resource-intensive.
*   **Compatibility:** A fork might break compatibility with other extensions or settings synchronization.
*   **Deployment:** Users would need to download a separate binary executable instead of just installing a plugin.

### The "Writer Mode" Solution
We implemented "Project Lumina" as a set of features within the `gdd-assistant` extension that aggressively modifies the VS Code runtime environment via the API.

*   **Programmatic UI Hiding:** We use commands (`gdd.enableWriterMode`) to programmatically hide the Activity Bar, Status Bar, Minimap, and Breadcrumbs.
*   **Theme Injection:** We inject a specific set of `workbench.colorCustomizations` to force a uniform, low-contrast "Graphite & Paper" theme (`#18181B`) across the editor, sidebar, and title bar, creating a "full bleed" app experience.
*   **Custom Webviews:** The primary interface (Interview Panel) uses a custom HTML/CSS renderer that completely bypasses VS Code's standard UI components, using a design system (`General Sans`, `IA Writer Duo`) that looks distinct from the host editor.

## 3. Current Implementation Status

### ✅ Implemented Features
1.  **Lumina Design Spec (`DESIGN_SPEC.md`)**:
    *   Defined the "Graphite & Paper" color palette (Zinc-900 / Zinc-100).
    *   Defined the "Anti-IDE" philosophy (Radical Reduction).

2.  **Commands**:
    *   `GDD: Enable Writer Mode`: Activates the focused environment.
    *   `GDD: Disable Writer Mode`: Restores standard VS Code settings.

3.  **Interview Panel Refactoring**:
    *   Replaced "Developer Chat" look with "Editorial Conversation" look.
    *   Floating, minimalist input area.
    *   Soft physics and subtle borders instead of heavy lines.

### 📁 Files Modified
*   `DESIGN_SPEC.md`: The design bible.
*   `gdd-vscode/package.json`: Added commands.
*   `gdd-vscode/src/extension.ts`: Implemented toggle logic.
*   `gdd-vscode/src/panels/InterviewPanel.ts`: Applied new CSS/HTML.

## 4. Future Roadmap (If we were to Fork)
If we eventually decide that the Extension API limits are too strict (e.g., we cannot remove the Title Bar completely or change the window chrome on all OSs), we could consider a lightweight fork using **VSCodium** as a base, pre-packaging this extension and these settings as defaults.

For now, the **Writer Mode** extension delivers 90% of the "Custom App" feel with 1% of the maintenance cost.
