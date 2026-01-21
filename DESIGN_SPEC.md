# Design Spec: Project "Lumina"
## Vision: The "Cursor" for Prose

We are transforming the utilitarian VS Code environment into a refined, editorial-grade writing instrument. The goal is to strip away the "IDE" mechanics and elevate the "Editor" experience, borrowing the best of Cursor's polish—smoothness, minimalism, and focus—but tuned for documentation.

### 1. Visual Traits
The "Cursor-like" aesthetic is defined not by what is there, but what is *missing*.

*   **Radical Reduction**: No visible scaffolding. Panels, bars, and icons only appear on interaction.
*   **Soft Physics**: Interfaces that feel fluid. Hover states shouldn't toggle; they should fade in.
*   **Surface Tension**: Instead of heavy drop shadows or thick borders, use 1px borders with slight transparency (`rgba(255,255,255,0.08)`) to define edges.
*   **Editorial Contrast**: High contrast text on soft, low-contrast backgrounds. The text should "pop" like ink on paper.

### 2. Color Palette & Typography

#### The Palette: "Graphite & Paper"
A sophisticated, low-saturation palette designed to reduce eye strain during long writing sessions.

**Dark Mode (The Default)**
*   **Canvas (Bg)**: `#18181B` (Zinc-900) — *Deep, warm charcoal, not void black.*
*   **Surface (Sidebar)**: `#1C1C1F` — *Subtle separation.*
*   **Border**: `#27272A` (Zinc-800) — *Barely there.*
*   **Text Primary**: `#F4F4F5` (Zinc-100) — *Crisp, readable.*
*   **Text Secondary**: `#A1A1AA` (Zinc-400) — *For metadata/comments.*
*   **Accent**: `#A5F3FC` (Cyan-200) — *Used sparingly for cursors/selections. A "technical" glowing blue.*
*   **Error/Warning**: `#FDA4AF` (Rose-300) — *Soft pastel alert, not aggressive red.*

**Light Mode (The Draft)**
*   **Canvas**: `#FAFAF9` (Warm Gray-50) — *Resembles heavy cream paper.*
*   **Text Primary**: `#18181B` — *Ink black.*

#### Typography Scale
Typography is the primary interface.

*   **Interface Font**: **'General Sans'** (Medium weight). Geometric but human.
    *   *Why*: It eliminates the "tech" feel of system fonts.
*   **Editor Font (Prose)**: **'IA Writer Duo'** or **'Input Sans'**.
    *   *Why*: Quasi-proportional fonts allow for a writing rhythm that feels less like coding and more like drafting.
*   **Headings**: **'Cabinet Grotesk'** (Variable).
    *   *Why*: Editorial authority.
*   **Code Blocks**: **'JetBrains Mono'** (with ligatures).
    *   *Why*: Classic reliability for actual snippets.

### 3. Reducing "IDE Clutter"
We treat VS Code as a chassis, stripping the bodywork.

1.  **The "Ghost" Activity Bar**:
    *   *Current*: Big icon strip on left.
    *   *Proposed*: Remove entirely. Move critical actions (Search, Git) to a top-left "Burger" menu or rely on Command Palette (`Cmd+K`).
2.  **Status Bar Dissolve**:
    *   *Current*: Busy bottom strip (Line number, encoding, branches, notifications).
    *   *Proposed*: Hide by default. Reveal on hover at the bottom pixel edge. Display *only* Word Count and Git Branch.
3.  **Tab "Islands"**:
    *   *Current*: Rectangular tabs attached to the editor.
    *   *Proposed*: Floating "pill" shaped tabs or a simple file tree. No file icons unless necessary. Active tab has a subtle underline, inactive tabs are 50% opacity.
4.  **Breadcrumbs**:
    *   *Current*: Path > To > File.
    *   *Proposed*: Show only current file name, centered at the top, fading out on scroll.
5.  **Gutter Cleanup**:
    *   Remove line numbers for Markdown files (optional toggle).
    *   Remove folding chevrons until hover.

### 4. Implementation Priorities (CSS/JSON)
To achieve this in a VS Code fork or theme extension:

*   **workbench.colorCustomizations**:
    *   Set `sideBar.background` to match `editor.background` for a seamless "full bleed" feel.
    *   Set `tab.activeBackground` to `transparent` (use border-bottom for active state).
    *   Set `editorGroupHeader.tabsBackground` to match editor.
*   **editor.tokenColorCustomizations**:
    *   Markdown headings: Bold, variable sizes, slight color shift (Zinc-100 to Zinc-300).
    *   Markdown quotes: Italic, serif font family override.
*   **Window Settings**:
    *   "window.titleBarStyle": "custom" (allows blending).
    *   "workbench.activityBar.visible": false.
    *   "editor.minimap.enabled": false (distraction).
    *   "editor.scrollbar.vertical": "hidden" (unless hovering).

---
*Created by Antigravity Design Systems*
